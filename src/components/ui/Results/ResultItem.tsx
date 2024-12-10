import React from 'react';
import { Result } from 'models/Search';
import ResultImage from './ResultImage';

export interface ResultItemProps {
	item: Result;
}

function ResultItem({ item }: ResultItemProps) {
	const itemName = item.getDocumentValue('title');
	const itemPrice = item.getDocumentValue('price');

	return (
		<div className="hawk-results__item">
			<ResultImage item={item} />
 
			<div className="hawk-results__item-name">
				<span>{itemName}</span>
			</div>
			<div className="hawk-results__item-price">
				<span>{itemPrice}</span>
			</div>

		</div>
	);
}

export default ResultItem;
