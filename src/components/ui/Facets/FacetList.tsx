import React, { useState } from 'react';

import { useHawksearch } from 'components/StoreProvider';
import { useHawkConfig } from 'components/ConfigProvider';
import Facet from './Facet';
import PlaceholderFacet from './PlaceholderFacet';
import { getFacetComponents } from 'components/ui/Facets/Overrides';

function FacetList() {
	const {
		store: { searchResults },
	} = useHawksearch();

	const { config } = useHawkConfig();

	// the number of random placeholders to render while we wait for results
	const [numPlaceholders] = useState(Math.round(Math.random() * (5 - 3) + 3));
	const components = getFacetComponents(config.facetOverrides || []);
	return (
		<ul className="hawk-facet-rail__facet-list" tabIndex={0} aria-label="Facet list">
			{searchResults
				? // if there are search results, render the facets
				  searchResults.Facets.map(facet => {
						if (!facet.IsVisible) {
							return null;
						}
						if (facet.ScrollThreshold > facet.Values.length) {
							return null;
						}
						if (facet.FieldType === 'tab' || facet.FacetType === 'related') {
							return null;
						}
						const registeredComponent = components.find(
							component => component.facetType === facet.FacetType
						);
						const Component = !registeredComponent ? null : registeredComponent.component;

						return (
							<Facet key={facet.FacetId} facet={facet}>
								{Component ? (
									<Component />
								) : (
									<div>
										{facet.FieldType} {facet.FacetType} is not implemented!
									</div>
								)}
							</Facet>
						);
				  })
				: // otherwise render a couple placeholders
				  [...Array(numPlaceholders)].map((_, i) => <PlaceholderFacet key={i} />)}
		</ul>
	);
}

export default FacetList;
