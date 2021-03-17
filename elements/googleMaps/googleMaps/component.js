import React from 'react'
import vcCake from 'vc-cake'

const vcvAPI = vcCake.getService('api')

export default class GoogleMaps extends vcvAPI.elementComponent {
  defaultSize = {
    width: '600',
    height: '450'
  }

  componentDidMount () {
    if (this.props.atts.embed) {
      this.setCustomSize(this.props.atts, this.getDefaultSize(this.props.atts.embed))
      this.appendMap(this.props.atts.embed)
    }
  }

  /* eslint-disable */
  UNSAFE_componentWillReceiveProps (nextProps) {
    if (nextProps.atts.embed && (this.props.atts.embed !== nextProps.atts.embed || this.props.atts.width !== nextProps.atts.width || this.props.atts.height !== nextProps.atts.height)) {
      this.setCustomSize(nextProps.atts, this.getDefaultSize(nextProps.atts.embed))
      this.appendMap(nextProps.atts.embed)
    }
  }

  /* eslint-enable */

  getSizeFromEmbed (embed) {
    const size = {}

    let widthAttr = embed.match(/width="\d+"/g)
    widthAttr = widthAttr ? widthAttr[0] : ''

    if (widthAttr) {
      let width = widthAttr.match(/\d+/g)
      width = width ? width[0] : ''
      size.width = width
    }

    let heightAttr = embed.match(/height="\d+"/g)
    heightAttr = heightAttr ? heightAttr[0] : ''

    if (heightAttr) {
      let height = heightAttr.match(/\d+/g)
      height = height ? height[0] : ''
      size.height = height
    }
    return size
  }

  getDefaultSize (embed) {
    const size = embed ? this.getSizeFromEmbed(embed) : ''
    return {
      width: size && size.width ? size.width : this.defaultSize.width,
      height: size && size.height ? size.height : this.defaultSize.height
    }
  }

  setCustomSize (atts, defaultSize) {
    let width = this.validateSize(atts.width)
    let height = this.validateSize(atts.height)

    width = /^\d+$/.test(width) ? `${width}px` : width
    height = /^\d+$/.test(height) ? `${height}px` : height

    const customSize = {
      width: width || `${defaultSize.width}px`,
      height: height || `${defaultSize.height}px`
    }
    if (!height) {
      customSize.paddingBottom = defaultSize.height / defaultSize.width * 100 + '%'
      customSize.height = 'auto'
      this.setSizeState(customSize)
    } else {
      this.setSizeState(customSize)
    }
  }

  setSizeState (size) {
    this.setState({ size })
  }

  validateSize (value) {
    const units = ['px', 'em', 'rem', '%', 'vw', 'vh']
    const re = new RegExp('^-?\\d*(\\.\\d{0,9})?(' + units.join('|') + ')?$')
    if (value === '' || value.match(re)) {
      return value
    } else {
      return null
    }
  }

  appendMap (tagString = '') {
    const component = this.refs.mapInner
    component.innerHTML = tagString
  }

  render () {
    const { id, atts, editor } = this.props
    const { customClass, alignment, width, height, metaCustomId } = atts
    let classes = 'vce-google-maps'
    const innerClasses = 'vce-google-maps-inner'
    let wrapperClasses = 'vce-google-maps-wrapper vce'
    const customProps = {}
    const innerProps = {}
    const wrapperProps = {}

    if (typeof customClass === 'string' && customClass) {
      classes += ' ' + customClass
    }

    wrapperProps.style = {
      width: this.state ? (this.state.size ? this.state.size.width : null) : null,
      height: this.state ? (this.state.size ? this.state.size.height : null) : null
    }

    innerProps.style = {
      paddingBottom: this.state ? (this.state.size ? this.state.size.paddingBottom : null) : null
    }

    if (width) {
      wrapperClasses += ' vce-google-maps--width-custom'
    }

    if (height) {
      wrapperClasses += ' vce-google-maps--height-custom'
    } else {
      wrapperClasses += ' vce-google-maps-proportional'
    }

    if (alignment) {
      classes += ` vce-google-maps--align-${alignment}`
    }

    customProps.key = `customProps:${id}`

    if (metaCustomId) {
      customProps.id = metaCustomId
    }

    const doAll = this.applyDO('all')

    return (
      <div {...customProps} className={classes} {...editor}>
        <div className={wrapperClasses} {...wrapperProps} id={'el-' + id} {...doAll}>
          <div className={innerClasses} {...innerProps} ref='mapInner' />
        </div>
      </div>
    )
  }
}
