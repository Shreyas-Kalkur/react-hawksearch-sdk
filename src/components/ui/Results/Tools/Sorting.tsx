import React from 'react';

import { useHawksearch } from 'components/StoreProvider';
import { useTranslation } from 'react-i18next';

function Sorting() {
	const {
		store: { searchResults, pendingSearch },
		actor,
	} = useHawksearch();

	const { t, i18n } = useTranslation();

	function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
		actor.setSearch({
			SortBy: event.currentTarget.value,
		});
	}

	return (
		<div className="hawk-sorting">
			<span id="sort-label" className="hawk-sorting__label">
				{t('Sort By')}
			</span>

			<select value={pendingSearch.SortBy} onChange={onChange} aria-labelledby="sort-label">
				{searchResults ? (
					searchResults.Sorting.Items.map(sortingItem => (
						<option key={sortingItem.Value} value={sortingItem.Value} selected={sortingItem.Selected}>
							{sortingItem.Label}
						</option>
					))
				) : (
					<option value="score">Best Match</option>
				)}
			</select>
		</div>
	);
}

export default Sorting;
