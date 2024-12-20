import React, { useState, useEffect } from 'react';
import NumberFormat from 'react-number-format';

export interface SliderNumericInputsProps {
	min: number;
	max: number;
	values: number[];
	isCurrency: boolean;
	currencySymbol: string;
	decimalPrecision: number;
	onValueChange(minValue: number, maxValue: number): void;
}
function SliderNumericInputs(sliderProps: SliderNumericInputsProps) {
	const [minValue, setMinValue] = useState('');
	const [maxValue, setMaxValue] = useState('');
	const [previousMinValue, setPreviousMinValue] = useState('');
	const [previousMaxValue, setPreviousMaxValue] = useState('');

	function onMinUpdate(values: any) {
		const { formattedValue, value } = values;

		const newMinValue = Number(value);
		if (isNaN(newMinValue) || minValue === value) {
			return;
		}

		setMinValue(value);
	}

	function onMaxUpdate(values: any) {
		const { formattedValue, value } = values;

		const newMaxValue = Number(value);
		if (isNaN(newMaxValue) || maxValue === value) {
			return;
		}
		setMaxValue(value);
	}

	function reloadFacets() {
		if (minValue !== previousMinValue || maxValue !== previousMaxValue) {
			sliderProps.onValueChange(Number(minValue), Number(maxValue));
			setPreviousMinValue(minValue);
			setPreviousMaxValue(maxValue);
		}
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			reloadFacets();
		}
	}

	useEffect(() => {
		setMinValue(sliderProps.values[0].toString());
		setMaxValue(sliderProps.values[1].toString());
	}, [sliderProps]);

	return (
		<div className="hawk-sliderNumeric">
			<NumberFormat
				thousandSeparator={sliderProps.isCurrency}
				prefix={sliderProps.isCurrency ? sliderProps.currencySymbol : ''}
				value={minValue}
				className="hawk-numericInput numeric-from"
				min={sliderProps.min}
				max={sliderProps.max}
				onValueChange={onMinUpdate}
				onBlur={reloadFacets}
				onKeyDown={onKeyDown}
				decimalScale={sliderProps.decimalPrecision}
				aria-label="min range"
			/>

			<NumberFormat
				thousandSeparator={sliderProps.isCurrency}
				prefix={sliderProps.isCurrency ? sliderProps.currencySymbol : ''}
				value={maxValue}
				className="hawk-numericInput numeric-to"
				min={sliderProps.min}
				max={sliderProps.max}
				onValueChange={onMaxUpdate}
				onBlur={reloadFacets}
				onKeyDown={onKeyDown}
				decimalScale={sliderProps.decimalPrecision}
				aria-label="max range"
			/>
		</div>
	);
}

export default SliderNumericInputs;
