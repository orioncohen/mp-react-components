import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { Range, getTrackBackground } from 'react-range';
import { countDecimals } from '../utils';
import '../RangeSlider/RangeSlider.css';
import * as d3 from 'd3';
import { useDebounce } from '../../../utils/hooks';
import { renderMark, renderThumb, renderTrack } from '../RangeSlider/RangeSlider';

const STEPDEF = 0.1;
const MIN = -100;
const MAX = 30000;

export interface DualRangeSliderProps {
  /**
   * The ID used to identify this component in Dash callbacks
   */
  id?: string;
  /**
   * Dash-assigned callback that should be called whenever any of the
   * properties change
   */
  setProps?: (value: any) => any;
  /**
   * Class name(s) to append to the component's default class.
   */
  className?: string;
  /**
   * Array with the minimum and maximum possible values.
   * Note that the domain bounds will be made "nice" so that
   * the slider ticks can be placed on easy-to-read numbers.
   */
  domain: number[];
  /**
   * Array with the initial min and max values that the slider
   * should be set to.
   */
  initialValues: number[];
  /**
   * Number by which the slider handles should move with each step.
   * Defaults to 1.
   */
  step: number;
  /**
   * Number of milliseconds that should pass between typing into the slider
   * number input and the slider handles updating.
   */
  debounce?: number;
  /**
   * Set to true to display a "+" with the upper bound tick (e.g. "100+").
   * Use this to indicate that the upper bound is inclusive (e.g. 100 or more).
   */
  inclusiveTickBounds?: boolean;
  /**
   * Function to call when slider values change.
   */
  onChange?: (values: number[]) => void;
  /**
   * Function to call when the slider props change.
   * This can be used to lift the new "nice" domain upwards.
   */
  onPropsChange?: (props: any) => void;
}

/**
 * Ensure the slider values are valid.
 * i.e. ensure that the values are within the domain bounds
 * and that the first value is less than the second value.
 * @param vals array of slider lower and upper values e.g. [4, 27]
 * @param domain array of original slider lower and upper limits e.g. [1, 49]
 * @param niceDomain array of rounded (nice) slider lower and upper limits e.g. [0, 50]
 * @returns valid array of slider values
 */
const niceInitialValues = (vals, domain, niceDomain) => {
  /**
   * The lower bound will be null if initialized from a url that only has a max param.
   * The upper bound will be null if initialized from a url that only has a min param.
   * When this happens, set value to the corresponding nice domain bound.
   */
  if (vals[0] === null) vals[0] = niceDomain[0];
  if (vals[1] === null) vals[1] = niceDomain[1];

  const upperBoundIsValid =
    vals[1] <= niceDomain[1] && vals[1] >= vals[0] && vals[1] >= niceDomain[0];
  const lowerBoundIsValid =
    vals[0] >= niceDomain[0] && vals[0] <= vals[1] && vals[0] <= niceDomain[1];

  if (vals[0] === domain[0] && vals[1] === domain[1]) {
    return [niceDomain[0], niceDomain[1]];
  } else if (upperBoundIsValid && !lowerBoundIsValid) {
    return [niceDomain[0], vals[1]];
  } else if (lowerBoundIsValid && !upperBoundIsValid) {
    return [vals[0], niceDomain[1]];
  } else if (lowerBoundIsValid && upperBoundIsValid) {
    return vals;
  } else {
    return [niceDomain[0], niceDomain[1]];
  }
};

/**
 * Slider input with controls for both the minimum and maximum bounds.
 */
export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  domain = [0, 100],
  step = 1,
  initialValues = domain.slice(),
  debounce,
  onChange = () => undefined,
  onPropsChange = () => undefined,
  ...otherProps
}) => {
  const props = { domain, step, initialValues, debounce, onChange, onPropsChange, ...otherProps };
  const decimals = countDecimals(step);
  const tickCount = 5;
  const scale = d3.scaleLinear().domain(domain).nice(tickCount);
  const niceDomain = scale.domain();
  const ticks = scale.ticks(5);
  const [values, setValues] = useState(niceInitialValues(initialValues, domain, niceDomain));
  const [lowerBound, setLowerBound] = useState(values[0]);
  const [upperBound, setUpperBound] = useState(values[1]);
  const [lowerBoundToDebounce, setLowerBoundToDebounce] = useState(lowerBound);
  const [upperBoundToDebounce, setUpperBoundToDebounce] = useState(upperBound);
  const debouncedLowerBound = debounce
    ? useDebounce(lowerBoundToDebounce, debounce)
    : lowerBoundToDebounce;
  const debouncedUpperBound = debounce
    ? useDebounce(upperBoundToDebounce, debounce)
    : upperBoundToDebounce;

  const handleSliderFinalChange = (vals) => {
    if (onChange) {
      onChange(
        vals.map((val) => {
          return parseFloat(val.toFixed(decimals));
        })
      );
    }
  };

  const handleSliderChange = (vals) => {
    setValues(vals);
    setLowerBound(vals[0]);
    setUpperBound(vals[1]);
  };

  /**
   * Set the lowerBound input value and its debounce value
   * Setting the debounce value will trigger handleSliderFinalChange
   * after the specified delay.
   * The bound values are set using the raw input strings to allow
   * users to type in negative numbers.
   */
  const handleLowerInputChange = (e) => {
    setLowerBound(e.target.value);
    setLowerBoundToDebounce(e.target.value);
  };

  /**
   * Same as above but for upperBound
   */
  const handleUpperInputChange = (e) => {
    setUpperBound(e.target.value);
    setUpperBoundToDebounce(e.target.value);
  };

  /**
   * Triggered by debouncedLowerBound effect
   * Ensures that the value in the input is valid and within
   * the set limits.
   * Handles updating values and triggering a final slider change event.
   */
  const validateDebouncedLowerBound = () => {
    const lowerBoundFloat = parseFloat(debouncedLowerBound);
    const upperBoundFloat = parseFloat(upperBound);
    let newValues = [lowerBoundFloat, upperBoundFloat];
    if (lowerBoundFloat > upperBoundFloat && lowerBoundFloat <= niceDomain[1]) {
      setUpperBound(lowerBoundFloat);
      newValues = [lowerBoundFloat, lowerBoundFloat];
    } else if (lowerBoundFloat < niceDomain[0]) {
      setLowerBound(niceDomain[0]);
      newValues = [niceDomain[0], upperBoundFloat];
    } else if (lowerBoundFloat > niceDomain[1]) {
      setLowerBound(niceDomain[1]);
      setUpperBound(niceDomain[1]);
      newValues = [niceDomain[1], niceDomain[1]];
    }

    if (newValues[0] !== values[0] || newValues[1] !== values[1]) {
      setValues(newValues);
      handleSliderFinalChange(newValues);
    }
  };

  /**
   * Same as above but for debouncedUpperBound
   */
  const validateDebouncedUpperBound = () => {
    const lowerBoundFloat = parseFloat(lowerBound);
    const upperBoundFloat = parseFloat(debouncedUpperBound);
    let newValues = [lowerBoundFloat, upperBoundFloat];
    if (upperBoundFloat < lowerBoundFloat && upperBoundFloat >= niceDomain[0]) {
      setLowerBound(upperBoundFloat);
      newValues = [upperBoundFloat, upperBoundFloat];
    } else if (upperBoundFloat > niceDomain[1]) {
      setUpperBound(niceDomain[1]);
      newValues = [lowerBoundFloat, niceDomain[1]];
    } else if (upperBoundFloat < niceDomain[0]) {
      setUpperBound(niceDomain[0]);
      setLowerBound(niceDomain[0]);
      newValues = [niceDomain[0], niceDomain[0]];
    }

    if (newValues[0] !== values[0] || newValues[1] !== values[1]) {
      setValues(newValues);
      handleSliderFinalChange(newValues);
    }
  };

  /**
   * Domain props are made "nice" (rounded bounds for nice ticks)
   * This effect lifts the prop changes up to the parent
   */
  useEffect(() => {
    onPropsChange({ domain: niceDomain, initialValues: values });
  }, []);

  /**
   * If the initialValues prop is changed from outside this component
   * trigger a slider change
   */
  useEffect(() => {
    handleSliderChange(niceInitialValues(initialValues, domain, niceDomain));
  }, [initialValues]);

  /**
   * These two effects are triggered when debouncedLowerBound and debouncedUpperBound
   * are changed (respectively).
   * This happens X milliseconds after lowerBoundToDebounce/upperBoundToDebounce is set.
   * Using a separate variable for debouncing makes it so that only text input changes
   * to the bounds will trigger the debounce effect, not regular slider changes.
   * This prevents double firing the final onChange event on slider changes.
   */
  useEffect(() => {
    validateDebouncedLowerBound();
  }, [debouncedLowerBound]);

  useEffect(() => {
    validateDebouncedUpperBound();
  }, [debouncedUpperBound]);

  return (
    <div
      id={props.id}
      className={classNames('mpc-dual-range-slider mpc-range-slider', props.className)}
      data-testid="dual-range-slider"
    >
      <div className="level is-mobile mb-1">
        <div className="level-left">
          <input
            data-testid="lower-bound-input"
            className="input is-small"
            type="number"
            value={lowerBound}
            min={niceDomain[0]}
            max={niceDomain[1]}
            step={step}
            onChange={handleLowerInputChange}
          />
        </div>
        <div className="level-right">
          <input
            data-testid="upper-bound-input"
            className="input is-small"
            type="number"
            value={upperBound}
            min={niceDomain[0]}
            max={niceDomain[1]}
            step={step}
            onChange={handleUpperInputChange}
          />
        </div>
      </div>
      <div className="slider">
        <Range
          values={values}
          step={step}
          min={niceDomain[0]}
          max={niceDomain[1]}
          onChange={handleSliderChange}
          onFinalChange={handleSliderFinalChange}
          renderTrack={renderTrack(values, niceDomain, ['#ccc', '#3273dc', '#ccc'])}
          renderThumb={renderThumb()}
          renderMark={renderMark(step, ticks, niceDomain, props.inclusiveTickBounds)}
        />
      </div>
    </div>
  );
};
