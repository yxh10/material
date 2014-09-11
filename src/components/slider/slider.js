/**
 * @ngdoc module
 * @name material.components.slider
 */
angular.module('material.components.slider', [
  'material.animations'
])
.directive('materialSlider', [
  '$materialEffects',
  '$timeout',
  '$$rAF',
  '$window',
  SliderDirective
]);

/**
 * @ngdoc directive
 * @name materialSlider
 * @module material.components.slider
 * @restrict E
 * @description
 * The `<material-slider>` component allows the user to choose from a range of
 * values.
 *
 * It has two modes: 'normal' mode, where the user slides between a wide range
 * of values, and 'discrete' mode, where the user slides between only a few
 * select values.
 *
 * To enable discrete mode, add the `discrete` attribute to a slider, 
 * and use the `step` attribute to change the distance between
 * values the user is allowed to pick.
 *
 * @usage
 * <h4>Normal Mode</h4>
 * <hljs lang="html">
 * <material-slider ng-model="myValue" min="5" max="500">
 * </material-slider>
 * </hljs>
 * <h4>Discrete Mode</h4>
 * <hljs lang="html">
 * <material-slider discrete ng-model="myDiscreteValue" step="10" min="10" max="130">
 * </material-slider>
 * </hljs>
 *
 * @param {boolean=} discrete Whether to enable discrete mode.
 * @param {number=} step The distance between values the user is allowed to pick. Default 1.
 * @param {number=} min The minimum value the user is allowed to pick. Default 0.
 * @param {number=} max The maximum value the user is allowed to pick. Default 100.
 */ 
function SliderDirective($materialEffects, $timeout, $$rAF, $window) {
  var hasTouch = !!('ontouchend' in document);
  var POINTERDOWN_EVENT = hasTouch ? 'touchstart' : 'mousedown';
  var POINTERUP_EVENT = hasTouch ? 'touchend touchcancel' : 'mouseup mouseleave';
  var POINTERMOVE_EVENT = hasTouch ? 'touchmove' : 'mousemove';

  return {
    require: '?ngModel',
    scope: {
    },
    template:
      '<div class="slider-track-container">' +
        '<div class="slider-track">' +
        '</div>' +
        '<div class="slider-track slider-track-fill">' +
        '</div>' +
        '<div class="slider-track-ticks">' +
        '</div>' +
      '</div>' +
      '<div class="slider-thumb-container">' +
        '<div class="slider-focus-thumb">' +
        '</div>' +
        '<div class="slider-focus-ring">' +
        '</div>' +
        '<div class="slider-sign">' +
          '<span class="slider-thumb-text" ng-bind="modelValue">' +
          '</span>' +
        '</div>' +
        '<div class="slider-disabled-thumb">' +
        '</div>' +
        '<div class="slider-thumb">' +
        '</div>' +
      '</div>',
    link: postLink
  };

  function postLink(scope, element, attr, ngModelCtrl) {
    var thumb = angular.element(element[0].querySelector('.slider-thumb'));
    var thumbContainer = thumb.parent();
    var trackContainer = angular.element(element[0].querySelector('.slider-track-container'));
    var activeTrack = angular.element(element[0].querySelector('.slider-track-fill'));
    var tickContainer = angular.element(element[0].querySelector('.slider-track-ticks'));

    // Default values, overridable by attrs
    attr.min ? attr.$observe('min', updateMin) : updateMin(0);
    attr.max ? attr.$observe('max', updateMax) : updateMax(100);
    attr.step ? attr.$observe('step', updateStep) : updateStep(1);

    // On resize, recalculate the slider's dimensions and re-render
    var onWindowResize = $$rAF.debounce(function() {
      refreshSliderDimensions();
      ngModelRender();
    });
    angular.element($window).on('resize', onWindowResize);
    scope.$on('$destroy', function() {
      angular.element($window).off('resize', onWindowResize);
    });

    element.attr('tabIndex', 0);
    element.on('keydown', keydownListener);
    element.on(POINTERDOWN_EVENT, onPointerDown);
    element.on(POINTERMOVE_EVENT, onPointerMove);
    element.on(POINTERUP_EVENT, onPointerUp);

    ngModelCtrl.$render = ngModelRender;
    ngModelCtrl.$viewChangeListeners.push(ngModelRender);
    ngModelCtrl.$formatters.push(minMaxValidator);
    ngModelCtrl.$formatters.push(stepValidator);

    /**
     * Attributes
     */
    var min, max, step;
    function updateMin(value) { min = parseFloat(value); }
    function updateMax(value) { max = parseFloat(value); }
    function updateStep(value) { 
      step = parseFloat(value); 
      if (angular.isDefined(attr.discrete)) {
        tickContainer.empty();
        for (var i = min; i <= max; i += step) {
          tickContainer.append('<span class="slider-track-tick">');
        }
      }
    }


    /**
     * Refreshing Dimensions
     */
    var sliderDimensions = {};
    var debouncedRefreshDimensions = Util.debounce(refreshSliderDimensions, 5000);
    refreshSliderDimensions();
    function refreshSliderDimensions() {
      sliderDimensions = trackContainer[0].getBoundingClientRect();
    }
    function getSliderDimensions() {
      debouncedRefreshDimensions();
      return sliderDimensions;
    }

    /**
     * Slide listeners
     */
    var pointerState = {};
    function onPointerDown(ev) {
      if (element[0].hasAttribute('disabled')) return;
      if (pointerState.down) return;

      pointerState.down = true;
      element.addClass('active');
      element[0].focus();

      refreshSliderDimensions();
      doEventSliderMovement(ev);
    }
    function onPointerMove(ev) {
      if (!pointerState.down) return;

      if (!pointerState.moving) {
        pointerState.moving = true;
        element.addClass('panning');
      }

      ev.preventDefault();
      doEventSliderMovement(ev);
    }
    function onPointerUp(ev) {
      pointerState = {};
      element.removeClass('panning active');
    }
    function doEventSliderMovement(ev) {
      // Support jQuery events
      ev = ev.originalEvent || ev;
      var x = ev.touches ? ev.touches[0].pageX : ev.pageX;

      var percent = (x - sliderDimensions.left) / (sliderDimensions.width);
      scope.$evalAsync(function() { setModelValue(min + percent * (max - min)); });
    }

    /**
     * left/right arrow listener
     */
    function keydownListener(ev) {
      if (ev.which === Constant.KEY_CODE.LEFT_ARROW) {
        ev.preventDefault();
        scope.$evalAsync(function() { setModelValue(ngModelCtrl.$viewValue - step); });
      } else if (ev.which === Constant.KEY_CODE.RIGHT_ARROW) {
        ev.preventDefault();
        scope.$evalAsync(function() { setModelValue(ngModelCtrl.$viewValue + step); });
      }
    }

    /**
     * ngModel setters and validators
     */
    function setModelValue(value) {
      ngModelCtrl.$setViewValue( minMaxValidator(stepValidator(value)) );
    }
    function ngModelRender() {
      var percent = (ngModelCtrl.$viewValue - min) / (max - min);
      scope.modelValue = ngModelCtrl.$viewValue;
      setSliderPercent(percent);
    }

    function minMaxValidator(value) {
      if (angular.isNumber(value)) {
        return Math.max(min, Math.min(max, value));
      }
    }
    function stepValidator(value) {
      if (angular.isNumber(value)) {
        return Math.round(value / step) * step;
      }
    }

    /**
     * @param percent 0-1
     */
    function setSliderPercent(percent) {
      activeTrack.css('width', (percent * 100) + '%');
      thumbContainer.css(
        $materialEffects.TRANSFORM, 
        'translateX(' + getSliderDimensions().width * percent + 'px)'
      );
      element.toggleClass('slider-min', percent === 0);
    }

  }
}
