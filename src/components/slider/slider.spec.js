
describe('material-slider', function() {

  beforeEach(module('material.components.slider'));

  it('should set set on press', inject(function($compile, $rootScope, $timeout) {
    var slider = $compile('<material-slider ng-model="value" min="0" max="100">')($rootScope);
    $rootScope.$apply('value = 50');
    var sliderCtrl = slider.controller('materialSlider');

    sliderCtrl._onInput({
      eventType: Hammer.INPUT_START,
      center: { x: 0 }
    });
    $timeout.flush();
  }));


});
