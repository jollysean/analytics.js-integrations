
/**
* Module dependencies.
*/

var integration = require('analytics.js-integration');
var Identify = require('facade').Identify;
var Track = require('facade').Track;
var iso = require('to-iso-string');
var clone = require('clone');
var each = require('each');
var bind = require('bind');
// Couldn't get around requirejs error for require('json')
// var json = require('json');
var json = window.JSON;
var domify = require('domify');

/**
* Expose `Extole` integration.
*/

var Extole = module.exports = integration('Extole')
  .global('extole')
  .option('clientId', '')
  .mapping('events')
  .tag('main', '<script src="//tags.extole.com/{{ clientId }}/core.js">')
  // using domify instead of .tag; .tag didn't work
  // .tag('conversion', '<script type="extole/conversion">{{ params }}');

/**
* Initialize.
*
* @param {Object} page
*/

Extole.prototype.initialize = function(page){
  var self = this;
  if (self.loaded()) return self.ready();
  this.load('main', function(){
    // window.extole.mainCb = self.ready;
    self.ready();
  });
};

/**
* Loaded?
*
* @return {Boolean}
*/

Extole.prototype.loaded = function(){
  return !!(window.extole);
};

/**
* Track.
*
* @param {Track} track
*/

Extole.prototype.track = function(track){
  var event = track.event();
  var events = this.events(event);
  if (!events.length) return this.debug('No events found for %s', event);

  var params = {};
  params['tag:segment_event'] = event;
  var properties = track.properties();

  each(events, function(mapping){
    each(mapping, function(property, value){
      params[property] = properties[value];
    });
  });

  var conversion = {
    type: 'purchase',
    params: params
  };

  var conversionTag = this.injectConversionTag(conversion);

  // register a conversion with Extole
  if (window.extole.main && window.extole.main.fireConversion) {
    window.extole.main.fireConversion(conversionTag);
  } else if (window.extole.initializeGo) {
    window.extole.initializeGo().andWhenItsReady(function(){
      extole.main.fireConversion(conversionTag);
    });
  }
};

/**
* Completed Order.
*
* @param {Track} track
*/

Extole.prototype.completedOrder = function(track){

  // completedOrder only fires when there is no conversionEvents mapping
  if (Object.keys(this.options.events).length) return;
  var user = this.analytics.user();
  var orderId = track.orderId();
  var cart_value = track.revenue();
  // create and insert Extole's conversion tag
  var conversion = {
    type: 'purchase',
    params: {
      e: user.traits().email,
      'tag:cart_value': cart_value,
      partner_conversion_id: orderId
    }
  };

  var conversionTag = this.injectConversionTag(conversion);

  // register a conversion with Extole
  if (window.extole.main && window.extole.main.fireConversion){
    window.extole.main.fireConversion(conversionTag);
  } else if (window.extole.initializeGo) {
    window.extole.initializeGo().andWhenItsReady(function(){
      extole.main.fireConversion(conversionTag);
    });
  }
};

Extole.prototype.injectConversionTag = function(conversion){
  var conversionText = json.stringify(conversion);
  var conversionTag = domify('<script type="extole/conversion">' + conversionText + '</script>');
  var firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode.insertBefore(conversionTag, firstScript);
  return conversionTag;
}