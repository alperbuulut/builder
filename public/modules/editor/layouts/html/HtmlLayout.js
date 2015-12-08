var React = require('react');
require('./HtmlLayout.less');
var Utils = require('../../../../helpers/Utils');
var Element = require('./Element.js');
var Layout = React.createClass({
    render: function() {
        let elementsList;
        if(this.props.data.childNodes) {
            let data = Array.prototype.slice.call(this.props.data.childNodes);
            elementsList = data.map(function( element ){
                return <Element element={{element: element.tagName}} key={Utils.createKey()}/>
            });
        }
        return (<div className="vc-v-layouts-html">
            {elementsList}
        </div>);
    }
});
module.exports = Layout;