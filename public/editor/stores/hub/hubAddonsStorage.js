import { addStorage, getService, getStorage } from 'vc-cake'
import { getResponse } from 'public/tools/response'

const getCategory = (tag, categories) => {
  return categories ? categories.find(category => Object.values(category).find(value => value.elements.indexOf(tag) > -1)) : 'All'
}

addStorage('hubAddons', (storage) => {
  const workspaceStorage = getStorage('workspace')
  const notificationsStorage = getStorage('notifications')
  const hubAddonsService = getService('hubAddons')
  const utils = getService('utils')

  storage.on('start', () => {
    storage.state('addonTeasers').set(window.VCV_HUB_GET_ADDON_TEASER ? window.VCV_HUB_GET_ADDON_TEASER() : {})
    storage.state('addons').set(window.VCV_HUB_GET_ADDONS ? window.VCV_HUB_GET_ADDONS() : {})
  })

  storage.on('add', (addonsData, addBundle) => {
    const addons = storage.state('addons').get() || {}
    addons[addonsData.tag] = addonsData
    hubAddonsService.add(addonsData)
    storage.state('addons').set(Object.assign({}, addons))
    if (addBundle && addonsData && addonsData.bundlePath) {
      Promise.all([window.jQuery.getScript(addonsData.bundlePath)])
    }
  })

  storage.on('downloadAddon', (addon) => {
    const localizations = window.VCV_I18N ? window.VCV_I18N() : {}
    const { tag, name } = addon
    let bundle = 'addon/' + tag.charAt(0).toLowerCase() + tag.substr(1, tag.length - 1)
    const downloadedAddons = storage.state('addons').get()
    if (addon.bundle) {
      bundle = addon.bundle
    }
    const data = {
      'vcv-action': 'hub:download:addon:adminNonce',
      'vcv-bundle': bundle,
      'vcv-nonce': window.vcvNonce
    }
    const successMessage = localizations.successAddonDownload || '{name} has been successfully downloaded from the Visual Composer Hub and added to your library. To finish the installation process you need to reload the page.'
    if (downloadedAddons[tag]) {
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
            // Initialize addon depended elements
            if (jsonResponse.elements && Array.isArray(jsonResponse.elements)) {
              jsonResponse.elements.forEach((element) => {
                element.tag = element.tag.replace('element/', '')
                const category = getCategory(element.tag, jsonResponse.categories)
                getStorage('hubElements').trigger('add', element, category, true)
              })
            }
            if (jsonResponse.addons && Array.isArray(jsonResponse.addons)) {
              jsonResponse.addons.forEach((addon) => {
                addon.tag = addon.tag.replace('addon/', '')
                storage.trigger('add', addon, true)
              })
            }
            workspaceStorage.trigger('removeFromDownloading', tag)
          } else {
            tries++
            console.warn('failed to download addon status is false', jsonResponse, response)
            if (tries < 2) {
              tryDownload()
            } else {
              let errorMessage = localizations.licenseErrorAddonDownload || 'Failed to download addon (license expired or request timed out)'
              if (jsonResponse && jsonResponse.message) {
                errorMessage = jsonResponse.message
              }

              console.warn('failed to download addon status is false', errorMessage, response)
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
              text: localizations.defaultErrorAddonDownload || 'Failed to download addon',
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
        console.warn('failed to download addon general server error', response)
        if (tries < 2) {
          tryDownload()
        } else {
          notificationsStorage.trigger('add', {
            type: 'error',
            text: localizations.defaultErrorAddonDownload || 'Failed to download addon',
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
})
