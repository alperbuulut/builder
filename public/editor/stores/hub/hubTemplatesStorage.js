import { addStorage, getService, getStorage } from 'vc-cake'
import { getResponse } from 'public/tools/response'

const getCategory = (tag, categories) => {
  return categories ? categories.find(category => Object.values(category).find(value => value.elements.indexOf(tag) > -1)) : 'All'
}

addStorage('hubTemplates', (storage) => {
  const workspaceStorage = getStorage('workspace')
  const notificationsStorage = getStorage('notifications')
  const utils = getService('utils')
  const sharedAssetsStorage = getStorage('sharedAssets')
  const hubElementsStorage = getStorage('hubElements')
  storage.state('templates').set({})
  storage.state('templatesGroupsSorted').set([])

  storage.on('start', () => {
    storage.state('templateTeasers').set(window.VCV_HUB_GET_TEMPLATES_TEASER ? window.VCV_HUB_GET_TEMPLATES_TEASER() : {})
  })

  storage.on('downloadTemplate', (template) => {
    const { bundle, name } = template
    const localizations = window.VCV_I18N && window.VCV_I18N()
    const data = {
      'vcv-action': 'hub:download:template:adminNonce',
      'vcv-bundle': bundle,
      'vcv-nonce': window.vcvNonce
    }
    const tag = bundle.replace('template/', '').replace('predefinedTemplate/', '')
    const successMessage = localizations.successTemplateDownload || '{name} has been successfully downloaded from the Visual Composer Hub and added to your library'
    const hubTemplates = window.VCV_HUB_GET_TEMPLATES_TEASER()
    const findTemplate = hubTemplates.find(template => template.bundle === bundle)
    if (!findTemplate) {
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
          if (jsonResponse && jsonResponse.status) {
            notificationsStorage.trigger('add', {
              position: 'bottom',
              transparent: true,
              rounded: true,
              text: successMessage.replace('{name}', name),
              time: 5000
            })
            utils.buildVariables(jsonResponse.variables || [])
            // Initialize template depended elements
            if (jsonResponse.elements && Array.isArray(jsonResponse.elements)) {
              jsonResponse.elements.forEach((element) => {
                element.tag = element.tag.replace('element/', '')
                const category = getCategory(element.tag, jsonResponse.categories)
                getStorage('hubElements').trigger('add', element, category, true)
              })
            }
            if (jsonResponse.templates) {
              const template = jsonResponse.templates[0]
              template.id = template.id.toString()
              storage.trigger('add', template.type, template, jsonResponse.templateGroup || {})
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
                hubElementsStorage.trigger('addCssAssetInEditor', assetData)
              })
            }
            workspaceStorage.trigger('removeFromDownloading', tag)
          } else {
            tries++
            console.warn('failed to download template status is false', jsonResponse, response)
            if (tries < 2) {
              tryDownload()
            } else {
              let errorMessage = localizations.licenseErrorElementDownload || 'Failed to download template (license is expired or request to account has timed out).'
              if (jsonResponse && jsonResponse.message) {
                errorMessage = jsonResponse.message
              }

              console.warn('failed to download template status is false', errorMessage, response)
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
              text: localizations.defaultErrorTemplateDownload || 'Failed to download template.',
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
        console.warn('failed to download template general server error', response)
        if (tries < 2) {
          tryDownload()
        } else {
          notificationsStorage.trigger('add', {
            type: 'error',
            text: localizations.defaultErrorTemplateDownload || 'Failed to download template.',
            showCloseButton: 'true',
            icon: 'vcv-ui-icon vcv-ui-icon-error',
            time: 5000
          })
        }
      }
      utils.startDownload(bundle, data, successCallback, errorCallback)
    }
    tryDownload()
  })

  storage.on('add', (type, templateData, templateGroup) => {
    const all = storage.state('templates').get() || {}
    if (!all[type]) {
      all[type] = {
        name: templateGroup && templateGroup.name ? templateGroup.name : type,
        type: type,
        templates: []
      }
    }
    const templatesGroupsSorted = storage.state('templatesGroupsSorted').get()
    if (templatesGroupsSorted.indexOf(type) === -1) {
      templatesGroupsSorted.push(type)
      storage.state('templatesGroupsSorted').set(templatesGroupsSorted)
    }
    all[type].templates.push(templateData)
    storage.state('templates').set(all)
  })
  storage.on('remove', (type, id) => {
    const all = storage.state('templates').get() || {}
    if (all[type]) {
      const removeIndex = all[type].templates.findIndex((template) => {
        return template.id === id
      })
      all[type].templates.splice(removeIndex, 1)
      storage.state('templates').set(all)
    }
  })
})
