import React from 'react'
import classNames from 'classnames'
import FieldDependencyManager from './fieldDependencyManager'
import EditFormSection from './editFormSection'
import {env} from 'vc-cake'

export default class EditFormFieldsForm extends React.Component {
  static propTypes = {
    element: React.PropTypes.object.isRequired,
    activeTab: React.PropTypes.object.isRequired,
    callFieldActivities: React.PropTypes.func.isRequired,
    onElementChange: React.PropTypes.func.isRequired
  }

  field = (field) => {
    return (
      <FieldDependencyManager
        {...this.props}
        key={`edit-form-field-${field.key}`}
        fieldKey={field.key}
        updater={this.props.onElementChange}
      />
    )
  }

  /**
   * Get an array of all edit form fields that act as accordion sections
   * @return Array
   */
  getAccordionSections () {
    return this.props.allTabs.map((tab) => {
      if (tab.fieldKey === 'dividers' && !env('NEW_DIVIDER_SHAPES')) {
        return null
      }
      return <EditFormSection
        {...this.props}
        key={tab.key}
        tab={tab}
      />
    })
  }

  render () {
    let { activeTab } = this.props

    let plateClass = classNames({
      'vcv-ui-editor-plate': true,
      'vcv-ui-state--active': true
    }, `vcv-ui-editor-plate-${activeTab.key}`)

    return <div className={plateClass}>
      {this.getAccordionSections()}
    </div>
  }
}
