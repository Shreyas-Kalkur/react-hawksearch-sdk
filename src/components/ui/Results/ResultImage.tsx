import React, { useState } from 'react';

import PlaceholderImage from './PlaceholderImage';
import { Result } from 'models/Search';

export interface ResultImageProps {
	item: Result;
	websiteUrl?: string;
	imageTitle?: string;
	imageUrl?: string;
	itemTitleFieldName?: string;
	imageUrlFieldName?: string;
	onLoadCallBack?: () => void;
	onClickImage?: (e) => void;
}

function ResultImage({
	item,
	websiteUrl,
	itemTitleFieldName,
	imageUrlFieldName,
	imageUrl,
	imageTitle,
	onLoadCallBack,
	onClickImage,
}: ResultImageProps) {
	const [imageLoaded, setImageLoaded] = useState(false);

	if (!imageUrl) {
		imageUrl = imageUrlFieldName ? item.getDocumentValue(imageUrlFieldName) : item.getDocumentValue('image');
	}
	if (!imageUrl) {
		return null;
	}

	if (!imageTitle) {
		imageTitle = itemTitleFieldName ? item.getDocumentValue(itemTitleFieldName) : item.getDocumentValue('title');
	}

	const absoluteUrlTester = new RegExp('^https?://|^//', 'i');
	if (!absoluteUrlTester.test(imageUrl) && websiteUrl) {
		imageUrl = websiteUrl + imageUrl;
	}

	return (
		<div className="hawk-results__item-image" {...(onClickImage && { onClick: e => onClickImage(e) })}>
			<div style={imageLoaded ? {} : { overflow: 'hidden', width: '0px', height: '0px' }}>
				<img
					onLoad={() => {
						if (onLoadCallBack) {
							onLoadCallBack();
						}
						setImageLoaded(true);
					}}
					src={imageUrl}
					alt={`Image for ${imageTitle}`}
				/>
			</div>

			{!imageLoaded ? (
				// if the main image hasn't loaded yet, show a placeholder
				<PlaceholderImage showSpinner={true} />
			) : null}
		</div>
	);
}

export default ResultImage;
