import React from 'react'
import vcCake from 'vc-cake'
import classNames from 'classnames'

const vcvAPI = vcCake.getService('api')

export default class SeparatorIcon extends vcvAPI.elementComponent {
  render () {
    const { id, atts, editor } = this.props
    const { separatorAlignment, separatorStyle, iconPicker, iconShape, iconSize, customClass, metaCustomId } = atts
    const customProps = {}
    let iconClasses = [`vce-icon-container ${iconPicker.icon}`]
    let iconWrapperClasses = ['vce-separator-with-icon--icon', 'vce-icon']
    let separatorContainerClasses = ['vce', 'vce-separator-with-icon-container']
    let separatorClasses = ['vce-separator-with-icon']
    const lineClasses = ['vce-separator-with-icon--line']
    let leftLineClasses = []
    let rightLineClasses = []

    if (typeof customClass === 'string' && customClass) {
      separatorContainerClasses.push(customClass)
    }

    if (separatorAlignment) {
      separatorContainerClasses.push(`vce-separator-with-icon--align-${separatorAlignment}`)
    }

    if (separatorStyle) {
      lineClasses.push(`vce-separator-with-icon--line--style-${separatorStyle}`)
    }

    if (iconShape) {
      iconWrapperClasses.push(`vce-separator-with-icon--icon--style-shape-${iconShape}`)
    }

    if (iconSize) {
      iconWrapperClasses.push(`vce-separator-with-icon--icon--style-size-${iconSize}`)
    }

    let mixinData = this.getMixinData('separatorColor')

    if (mixinData) {
      separatorClasses.push(`vce-separator-with-icon--color-${mixinData.selector}`)
    }

    mixinData = this.getMixinData('separatorWidth')

    if (mixinData) {
      separatorClasses.push(`vce-separator-with-icon--width-${mixinData.selector}`)
    }

    mixinData = this.getMixinData('separatorThickness')

    if (mixinData) {
      lineClasses.push(`vce-separator-with-icon-line--thickness-${mixinData.selector}`)
    }

    mixinData = this.getMixinData('iconColor')

    if (mixinData) {
      iconWrapperClasses.push(`vce-separator-with-icon--icon--style-color-${mixinData.selector}`)
    }

    mixinData = this.getMixinData('iconShapeColor')

    if (mixinData) {
      iconWrapperClasses.push(`vce-separator-with-icon--icon--style-shape-color-${mixinData.selector}`)
    }

    if (metaCustomId) {
      customProps.id = metaCustomId
    }

    separatorClasses = classNames(separatorClasses)
    separatorContainerClasses = classNames(separatorContainerClasses)
    iconClasses = classNames(iconClasses)
    iconWrapperClasses = classNames(iconWrapperClasses)

    if (separatorStyle === 'shadow') {
      lineClasses.push('vce-separator-shadow')
      leftLineClasses.push('vce-separator-shadow-left')
      rightLineClasses.push('vce-separator-shadow-right')
    }

    leftLineClasses.push(...lineClasses)
    leftLineClasses.push('vce-separator-with-icon--line-left')
    rightLineClasses.push(...lineClasses)
    rightLineClasses.push('vce-separator-with-icon--line-right')

    leftLineClasses = classNames(leftLineClasses)
    rightLineClasses = classNames(rightLineClasses)

    const doMargin = this.applyDO('margin')
    const doRest = this.applyDO('border padding background animation')

    return (
      <div className={separatorContainerClasses} id={'el-' + id} {...editor} {...doMargin}>
        <div className={separatorClasses} {...customProps} {...doRest}>
          <div className={leftLineClasses} />
          <div className={iconWrapperClasses}>
            <svg xmlns='https://www.w3.org/2000/svg' viewBox='0 0 769 769'>
              <path strokeWidth='40' d='M565.755 696.27h-360l-180-311.77 180-311.77h360l180 311.77z' />
            </svg>
            <span className={iconClasses} />
          </div>
          <div className={rightLineClasses} />
        </div>
      </div>
    )
  }
}
