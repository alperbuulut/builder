import { addStorage, getService, getStorage } from 'vc-cake'
import lodash from 'lodash'
import { getResponse } from 'public/tools/response'

const getCategory = (tag, categories) => {
  return categories ? categories.find(category => Object.values(category).find(value => value.elements.indexOf(tag) > -1)) : 'All'
}

const setCategoryState = (categoryData, storageState) => {
  const categoryName = Object.keys(categoryData)[0]
  const stateCategories = storageState.get()
  const isCategoryExists = Object.keys(stateCategories).find(category => category === categoryName)
  let newState
  if (isCategoryExists) {
    const mergedElements = lodash.union(stateCategories[categoryName].elements, categoryData[categoryName].elements)
    newState = stateCategories
    newState[categoryName].elements = mergedElements
  } else {
    newState = Object.assign(categoryData, stateCategories)
  }
  storageState.set(newState)
}

const parseData = (presets) => {
  const parsedPresets = []
  presets.forEach((preset) => {
    const newPreset = Object.assign({}, preset)
    try {
      newPreset.presetData = JSON.parse(window.decodeURIComponent(newPreset.presetData))
      parsedPresets.push(newPreset)
    } catch (e) {
      console.warn(e)
    }
  })
  return parsedPresets
}

addStorage('hubElements', (storage) => {
  const workspaceStorage = getStorage('workspace')
  const notificationsStorage = getStorage('notifications')
  const hubElementsService = getService('hubElements')
  const utils = getService('utils')
  const sharedAssetsStorage = getStorage('sharedAssets')

  storage.on('start', () => {
    storage.state('elements').set(window.VCV_HUB_GET_ELEMENTS ? window.VCV_HUB_GET_ELEMENTS() : {})
    const presets = window.VCV_ADDON_ELEMENT_PRESETS ? window.VCV_ADDON_ELEMENT_PRESETS() : []
    const parsedPresets = parseData(presets)
    storage.state('elementPresets').set(parsedPresets)
    storage.state('categories').set(window.VCV_HUB_GET_CATEGORIES ? window.VCV_HUB_GET_CATEGORIES() : {})
    storage.state('elementTeasers').set(window.VCV_HUB_GET_TEASER ? window.VCV_HUB_GET_TEASER() : {})
  })

  storage.on('add', (elementData, categoryData, addBundle) => {
    const elements = storage.state('elements').get() || {}
    elements[elementData.tag] = elementData
    hubElementsService.add(elementData)
    storage.state('elements').set(elements)
    setCategoryState(categoryData, storage.state('categories'))
    if (addBundle) {
      Promise.all([window.jQuery.getScript(elementData.bundlePath)])
    }
  })

  storage.on('downloadElement', (element) => {
    const localizations = window.VCV_I18N ? window.VCV_I18N() : {}
    const { tag } = element
    let bundle = 'element/' + tag.charAt(0).toLowerCase() + tag.substr(1, tag.length - 1)
    if (element.bundle) {
      bundle = element.bundle
    }
    const data = {
      'vcv-action': 'hub:download:element:adminNonce',
      'vcv-bundle': bundle,
      'vcv-nonce': window.vcvNonce
    }
    const successMessage = localizations.successElementDownload || '{name} has been successfully downloaded from the Visual Composer Hub and added to your library.'
    if (hubElementsService.get(tag) !== null) {
      return
    }

    const downloadingItems = workspaceStorage.state('downloadingItems').get() || []
    if (downloadingItems.includes(tag)) {
      return
    }
    downloadingItems.push(tag)
    workspaceStorage.state('downloadingItems').set(downloadingItems)

    let tries = 0
    const tryDownload = () => {
      const successCallback = (response) => {
        try {
          const jsonResponse = getResponse(response)
          const downloadingItemsState = workspaceStorage.state('downloadingItems').get()
          if (!downloadingItemsState.length) {
            return
          }
          if (jsonResponse && jsonResponse.status) {
            utils.buildVariables(jsonResponse.variables || [])
            if (jsonResponse.elements && Array.isArray(jsonResponse.elements)) {
              jsonResponse.elements.forEach((element) => {
                element.tag = element.tag.replace('element/', '')
                const category = getCategory(element.tag, jsonResponse.categories)
                storage.trigger('add', element, category, true)
                // use tag and name from the actual downloaded element
                const name = element.settings.name
                workspaceStorage.trigger('removeFromDownloading', element.tag)
                notificationsStorage.trigger('add', {
                  position: 'bottom',
                  transparent: true,
                  rounded: true,
                  text: successMessage.replace('{name}', name),
                  time: 5000
                })
              })
            }
            if (jsonResponse.sharedAssets && jsonResponse.sharedAssetsUrl) {
              Object.keys(jsonResponse.sharedAssets).forEach((assetName) => {
                const assetData = jsonResponse.sharedAssets[assetName]
                if (assetData.jsBundle) {
                  assetData.jsBundle = jsonResponse.sharedAssetsUrl + assetData.jsBundle
                }
                if (assetData.cssBundle) {
                  assetData.cssBundle = jsonResponse.sharedAssetsUrl + assetData.cssBundle
                }
                if (assetData.cssSubsetBundles) {
                  Object.keys(assetData.cssSubsetBundles).forEach((key) => {
                    assetData.cssSubsetBundles[key] = jsonResponse.sharedAssetsUrl + assetData.cssSubsetBundles[key]
                  })
                }
                sharedAssetsStorage.trigger('add', assetData)
                storage.trigger('addCssAssetInEditor', assetData)
              })
            }
          } else {
            tries++
            console.warn('failed to download element status is false', jsonResponse, response)
            if (tries < 2) {
              tryDownload()
            } else {
              let errorMessage = localizations.licenseErrorElementDownload || 'Failed to download element (license expired or request timed out)'
              if (jsonResponse && jsonResponse.message) {
                errorMessage = jsonResponse.message
              }

              console.warn('failed to download element status is false', errorMessage, response)
              notificationsStorage.trigger('add', {
                type: 'error',
                text: errorMessage,
                showCloseButton: 'true',
                icon: 'vcv-ui-icon vcv-ui-icon-error',
                time: 5000
              })
              workspaceStorage.trigger('removeFromDownloading', tag)
            }
          }
        } catch (e) {
          tries++
          console.warn('failed to parse download response', e, response)
          if (tries < 2) {
            tryDownload()
          } else {
            notificationsStorage.trigger('add', {
              type: 'error',
              text: localizations.defaultErrorElementDownload || 'Failed to download element',
              showCloseButton: 'true',
              icon: 'vcv-ui-icon vcv-ui-icon-error',
              time: 5000
            })
            workspaceStorage.trigger('removeFromDownloading', tag)
          }
        }
      }
      const errorCallback = (response) => {
        workspaceStorage.trigger('removeFromDownloading', tag)
        tries++
        console.warn('failed to download element general server error', response)
        if (tries < 2) {
          tryDownload()
        } else {
          notificationsStorage.trigger('add', {
            type: 'error',
            text: localizations.defaultErrorElementDownload || 'Failed to download element',
            showCloseButton: 'true',
            icon: 'vcv-ui-icon vcv-ui-icon-error',
            time: 5000
          })
        }
      }
      utils.startDownload(tag, data, successCallback, errorCallback)
    }
    tryDownload()
  })

  storage.on('addCssAssetInEditor', (asset) => {
    if (!asset.cssBundle && !asset.cssSubsetBundles) {
      return
    }

    const slugify = (text) => {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
    }

    const add = (bundle) => {
      const id = `${slugify(bundle)}-css`
      const styleElement = document.querySelector(`#vcv\\:assets\\:source\\:style\\:${id}`)

      if (!styleElement) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = bundle
        link.type = 'text/css'
        link.media = 'all'
        link.id = `vcv:assets:source:style:${id}`
        document.head.appendChild(link)
      }
    }
    if (asset.cssBundle) {
      add(asset.cssBundle)
    }
    if (asset.cssSubsetBundles) {
      Object.keys(asset.cssSubsetBundles).forEach((key) => {
        add(asset.cssSubsetBundles[key])
      })
    }
  })

  storage.on('addPreset', (elementPresetData) => {
    const elementPresetsState = storage.state('elementPresets').get() || []
    elementPresetsState.unshift(elementPresetData)
    storage.state('elementPresets').set(elementPresetsState)
  })
  storage.on('removePreset', (id) => {
    const elementPresetsState = storage.state('elementPresets').get() || []
    storage.state('elementPresets').set(elementPresetsState.filter(item => item.id !== id))
  })

  storage.registerAction('getPresetsByCategory', (categoryKey) => {
    const category = storage.state('categories').get()[categoryKey]
    const categoryTags = category && category.elements
    const categoryPresets = []
    if (!categoryTags) {
      return categoryPresets
    }
    const presets = storage.state('elementPresets').get()
    if (!presets) {
      return categoryPresets
    }

    presets.forEach((preset) => {
      const presetTag = preset.presetData.tag
      if (categoryTags.indexOf(presetTag) > -1) {
        categoryPresets.push(preset)
      }
    })

    return categoryPresets
  })
})
