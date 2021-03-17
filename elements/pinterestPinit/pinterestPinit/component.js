import React from 'react'
import vcCake from 'vc-cake'
const vcvAPI = vcCake.getService('api')

export default class PinterestPinit extends vcvAPI.elementComponent {
  componentDidMount () {
    this.insertHtml(this.props.atts)
  }

  /* eslint-disable */
  UNSAFE_componentWillReceiveProps (nextProps) {
    if (this.props.atts.type !== nextProps.atts.type) {
      this.insertHtml(nextProps.atts)
    }
  }
  /* eslint-enable */

  insertHtml (props) {
    let button = this.createHtml(props)
    let script = '<script type="text/javascript" async defer src="https://assets.pinterest.com/js/pinit.js"></script>'
    let html = button + script
    const wrapper = this.refs.pinterestInner
    this.updateInlineHtml(wrapper, html)

    let iframe = document.querySelector('#vcv-editor-iframe').contentWindow
    if (iframe.PinUtils) {
      iframe.PinUtils.build(this.getDomNode())
    }
  }

  createHtml (props) {
    let element = document.createElement('a')
    element.href = 'https://www.pinterest.com/pin/create/button/'

    if (props.type === 'default') {
      element.setAttribute('data-pin-do', 'buttonBookmark')
    } else {
      element.setAttribute('data-pin-do', 'buttonPin')
    }

    if (props.type === 'round') {
      element.setAttribute('data-pin-shape', 'round')
    } else if (props.type === 'large') {
      element.setAttribute('data-pin-height', '28')
    } else if (props.type === 'tallBubble') {
      element.setAttribute('data-pin-config', 'above')
    } else if (props.type === 'tallCounter') {
      element.setAttribute('data-pin-config', 'beside')
    }

    let elementWrapper = document.createElement('div')
    elementWrapper.appendChild(element)
    return elementWrapper.innerHTML
  }

  render () {
    let { id, atts, editor } = this.props
    let { customClass, alignment, metaCustomId } = atts
    let classes = 'vce-pinterest-pinit'
    let innerClasses = 'vce-pinterest-pinit-inner vce'
    let customProps = {}

    if (customClass) {
      classes += ` ${customClass}`
    }

    if (alignment) {
      classes += ` vce-pinterest-pinit--align-${alignment}`
    }

    if (metaCustomId) {
      customProps.id = metaCustomId
    }

    let doAll = this.applyDO('all')

    return <div {...customProps} className={classes} {...editor}>
      <div className={innerClasses} ref='pinterestInner' id={'el-' + id} {...doAll}>Google Plus Button</div>
    </div>
  }
}
