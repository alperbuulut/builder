import React from 'react'
import classNames from 'classnames'
import { env, getService, getStorage } from 'vc-cake'
import ElementControl from '../../addElement/lib/elementControl'

const dataProcessor = getService('dataProcessor')

export default class TeaserElementControl extends ElementControl {
  constructor (props) {
    super(props)
    const elements = getStorage('hubElements').state('elements').get()

    this.state = {
      allowDownload: window.VCV_HUB_ALLOW_DOWNLOAD(),
      elementState: typeof elements[ this.props.tag ] !== 'undefined' ? 'success' : 'inactive'
    }
    this.addElement = this.addElement.bind(this)
    this.downloadElement = this.downloadElement.bind(this)
    this.ajax = null
  }

  componentWillUnmount () {
    if (this.ajax) {
      this.ajax.abort()
      this.ajax = null
    }
  }

  downloadElement (e) {
    if (this.ajax || !this.state.allowDownload) {
      return
    }
    // TODO: start loader
    let bundle = e.currentTarget.dataset.bundle
    console.log('download', bundle)
    this.setState({ elementState: 'downloading' })

    let data = {
      'vcv-action': 'hub:download:element:adminNonce',
      'vcv-bundle': bundle,
      'vcv-nonce': window.vcvNonce
    }
    this.ajax = dataProcessor.appServerRequest(data).then((response, b, c, d, e) => {
      // TODO: Sync element and setState loader finished
      // TODO: Set success notice
      console.log('success', response, b, c, d, e)
      this.ajax = null
      try {
        let jsonResponse = window.JSON.parse(response)
        if (jsonResponse && jsonResponse.status && jsonResponse.element && jsonResponse.element.settings) {
          jsonResponse.element.tag = bundle.replace('element/', '')
          getStorage('hubElements').trigger('add', jsonResponse.element, true)
          this.setState({ elementState: 'success' })
        } else {
          // Failed
          this.setState({ elementState: 'failed' })
        }
      } catch (e) {
        // Failed
        console.warn(e)
        this.setState({ elementState: 'failed' })
      }
    }, () => {
      // Failed
      // TODO: Set failed notice and finish loader
      console.log('failed', arguments)
      this.setState({ elementState: 'failed' })
    })
  }

  render () {
    let { name, element } = this.props
    let { previewVisible, previewStyle, elementState } = this.state

    let itemElementClasses = classNames({
      'vcv-ui-item-element': true,
      'vcv-ui-item-element-inactive': elementState !== 'success'
    })

    let listItemClasses = classNames({
      'vcv-ui-item-list-item': true,
      'vcv-ui-item-list-item--inactive': false
    })
    let nameClasses = classNames({
      'vcv-ui-item-badge vcv-ui-badge--success': false,
      'vcv-ui-item-badge vcv-ui-badge--warning': false
    })

    let previewClasses = classNames({
      'vcv-ui-item-preview-container': true,
      'vcv-ui-state--visible': previewVisible
    })

    let publicPathThumbnail = element.metaThumbnailUrl
    let publicPathPreview = element.metaPreviewUrl

    let bundle
    if (env('HUB_TEASER_ELEMENT_DOWNLOAD')) {
      // element/lcfirst(tag)
      bundle = 'element/' + element.tag.charAt(0).toLowerCase() + element.tag.substr(1, element.tag.length - 1)
      if (element.bundle) {
        bundle = element.bundle
      }
    }

    let overlayOutput = <span className='vcv-ui-item-add vcv-ui-icon vcv-ui-icon-lock' />
    if (env('HUB_TEASER_ELEMENT_DOWNLOAD')) {
      let iconClasses = classNames({
        'vcv-ui-item-add': true,
        'vcv-ui-item-add-hub': true,
        'vcv-ui-icon': true,
        'vcv-ui-icon-download': elementState === 'inactive',
        'vcv-ui-icon-add': elementState === 'success',
        'vcv-ui-wp-spinner-light': elementState === 'downloading',
        'vcv-ui-icon vcv-ui-icon-lock': !this.state.allowDownload && this.state.elementState === 'inactive'
      })
      let action = elementState === 'success' ? this.addElement : this.downloadElement
      overlayOutput = <span data-bundle={bundle} className={iconClasses} onClick={action} />
    }

    return (
      <li className={listItemClasses}>
        <span className={itemElementClasses}
          onMouseEnter={this.showPreview}
          onMouseLeave={this.hidePreview}
          title={name}>
          <span className='vcv-ui-item-element-content'>
            <img className='vcv-ui-item-element-image' src={publicPathThumbnail} alt='' />
            <span className='vcv-ui-item-overlay'>
              {overlayOutput}
            </span>
          </span>
          <span className='vcv-ui-item-element-name'>
            <span className={nameClasses}>
              {name}
            </span>
          </span>
          <figure className={previewClasses} style={previewStyle}>
            <img className='vcv-ui-item-preview-image' src={publicPathPreview} alt='' />
            <figcaption className='vcv-ui-item-preview-caption'>
              <div className='vcv-ui-item-preview-text'>
                {element.metaDescription}
              </div>
            </figcaption>
          </figure>
        </span>
      </li>
    )
  }
}
