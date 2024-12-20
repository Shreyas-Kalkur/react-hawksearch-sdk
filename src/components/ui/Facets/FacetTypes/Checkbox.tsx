import React from 'react';
import { useHawksearch } from 'components/StoreProvider';
import { useFacet } from 'components/ui/Facets/Facet';
import { FacetSelectionState } from 'store/Store';
import DashCircleSVG from 'components/svg/DashCircleSVG';
import CheckmarkSVG from 'components/svg/CheckmarkSVG';
import PlusCircleSVG from 'components/svg/PlusCircleSVG';
import { useHawkConfig } from 'components/ConfigProvider';

enum FacetRangeDisplayType {
	Text = 1,
	Image = 2,
	Both = 3,
}

function Checkbox() {
	const { store } = useHawksearch();
	const { config } = useHawkConfig();

	const {
		facet,
		state: { facetValues },
		actor,
		renderer,
	} = useFacet();

	function renderOptions() {
		if (facet.FieldType === 'range') {
			return facetValues.map(correspondingValues => {
				const value = facet.Ranges.find(Range => Range.Value === correspondingValues.Value);

				if (!value) {
					return null;
				}

				const rangeValueAssetUrl = value ? config.dashboardUrl + value.AssetFullUrl : '';

				// facets can be selected or negated, so explicitly check that the facet is not selected
				const selectionState = store.isFacetSelected(facet, value.Value, store.negativeFacetValuePrefix).state;
				const isSelected = selectionState !== FacetSelectionState.NotSelected;
				const isNegated = selectionState === FacetSelectionState.Negated;

				return (
					<li key={value.Value} className="hawk-facet-rail__facet-list-item">
						<button
							onClick={e => actor.selectFacet(value.Value)}
							className="hawk-facet-rail__facet-btn"
							aria-pressed={isSelected}
						>
							<input type='checkbox' defaultChecked={isSelected} />
							{rangeValueAssetUrl !== '' ? (
								<>
									<span className="hawk-selectionInner">
										<span className="hawk-range-asset" title={value.Label} />
										{FacetRangeDisplayType.Text !== facet.FacetRangeDisplayType && (
											<img src={rangeValueAssetUrl} alt={value.Label} />
										)}
									</span>

									<span
										style={isNegated ? { textDecoration: 'line-through' } : undefined}
										className="hawk-facet-rail__facet-name"
									>
										{value.Label}{' '}
										{facet.ShowItemsCount && correspondingValues
											? `(${correspondingValues.Count})`
											: ''}
									</span>
								</>
							) : (
								<>
									<span
										style={isNegated ? { textDecoration: 'line-through' } : undefined}
										className="hawk-facet-rail__facet-name"
									>
										{value.Label}{' '}
										{facet.ShowItemsCount && correspondingValues
											? `(${correspondingValues.Count})`
											: ''}
									</span>
								</>
							)}
						</button>

						{renderFacetActions(value.Value || '', isNegated)}
					</li>
				);
			});
		} else {
			return facetValues.map(value => {
				// facets can be selected or negated, so explicitly check that the facet is not selected
				const selectionState = store.isFacetSelected(facet, value, store.negativeFacetValuePrefix).state;

				const isSelected = selectionState !== FacetSelectionState.NotSelected;
				const isNegated = selectionState === FacetSelectionState.Negated;
				let label = value.Label || '';
				if (label?.indexOf('%') !== -1) {
					label = encodeURI(label || '');
				}
				const decodedLabel = `${decodeURI(label)} ${facet.ShowItemsCount ? `(${value.Count})` : ''}`;

				return (
					<li key={value.Value} className="hawk-facet-rail__facet-list-item">
						<button
							onClick={e => actor.selectFacet(value)}
							className="hawk-facet-rail__facet-btn"
							aria-pressed={isSelected}
						>
							{!isNegated && <input type='checkbox' checked={isSelected} onChange={() => {}} />}

							<span
								style={isNegated ? { textDecoration: 'line-through' } : undefined}
								className="hawk-facet-rail__facet-name"
							>
								<div dangerouslySetInnerHTML={{ __html: decodedLabel }} />
							</span>
							{renderFacetActions(value.Value || '', isNegated)}
						</button>
					</li>
				);
			});
		}
	}

	function renderFacetActions(value: string, isNegated: boolean) {
		return (
			<button
				onClick={e => {
					e.stopPropagation();
					actor.negateFacet(value);
				}}
				className="hawk-facet-rail__facet-btn-exclude"
				aria-describedby="visually-hidden"
			>
				{isNegated ? (
					<>
						<PlusCircleSVG class="hawk-facet-rail__facet-btn-include" />
						<span id="visually-hidden" className="visually-hidden">
							Include facet
						</span>
					</>
				) : (
					<>
						<DashCircleSVG />
						<span id="visually-hidden" className="visually-hidden">
							Exclude facet
						</span>
					</>
				)}
			</button>
		);
	}

	function getScrollHeight(scrollHeight: number) {
		if (scrollHeight === 0) {
			return { height: 'inherit' };
		}
		return { height: scrollHeight, overflow: 'auto' };
	}

	return (
		<div className="hawk-facet-rail__facet-values">
			<div className="hawk-facet-rail__facet-values-checkbox">
				<ul className="hawk-facet-rail__facet-list" style={getScrollHeight(facet.ScrollHeight)}>
					{renderOptions()}
				</ul>
			</div>

			{/* /* render the default truncation control as we don't need to customize this */}
			{renderer.renderTruncation()}
		</div>
	);
}

export default Checkbox;
