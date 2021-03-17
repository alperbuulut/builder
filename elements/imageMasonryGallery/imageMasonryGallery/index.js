/* eslint-disable import/no-webpack-loader-syntax */
import vcCake from 'vc-cake'
import ImageMasonryGallery from './component'

const vcvAddElement = vcCake.getService('cook').add

vcvAddElement(
  require('./settings.json'),
  // Component callback
  (component) => {
    component.add(ImageMasonryGallery)
  },
  // css settings // css for element
  { 'css': require('raw-loader!./styles.css'), 'editorCss': require('raw-loader!./editor.css'), 'mixins': { 'imageGalleryColumns': { 'mixin': require('raw-loader!./cssMixins/imageGalleryColumns.pcss') }, 'imageGalleryGap': { 'mixin': require('raw-loader!./cssMixins/imageGalleryGap.pcss') } } },
  ''
)
