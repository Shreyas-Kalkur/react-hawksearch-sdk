import { Response as CompareDataResponse, Request as CompareItemRequest } from 'models/CompareItems';
import { Facet, Value } from 'models/Facets';
import { FacetSelectionState, SearchStore } from './Store';
import { FacetSelections, Request, Response, Result } from 'models/Search';
import { Request as ProductDetailsRequest, Response as ProductDetailsResponse } from 'models/ProductDetails';
import TrackingEvent, { SearchType } from 'components/TrackingEvent';
import axios, { CancelToken } from 'axios';
import { createGuid, getCookie, getVisitExpiry, getVisitorExpiry, setCookie, setRecentSearch } from 'helpers/utils';

import { Request as ClientIdRequest } from 'components/ui/MessageBox/Request';
import { ClientSelectionValue } from './ClientSelections';
import { FacetType } from 'models/Facets/FacetType';
import HawkClient from 'net/HawkClient';
import { Request as PinItemRequest } from 'models/PinItems';
import React from 'react'
import { Request as RebuildIndexRequest } from 'models/RebuildIndex';
import { Request as SortingOrderRequest } from 'models/PinItemsOrder';
import { parseLocation } from 'util/QueryString';
import { useEffect } from 'react';
import { useHawkConfig } from 'components/ConfigProvider';
import { useMergableState } from 'util/MergableState';

interface ClientData {
	VisitorId: string;
	VisitId: string;
	UserAgent: string;
	PreviewBuckets?: number[];
	Custom?: {
		language: string;
	};
}

export interface SearchActor {
	/**
	 * Performs a search with the currently configured pending search request. The search request can be
	 * configured via the `setSearch` method. This method usually doesn't need to be called directly, as
	 * the `StoreProvider` component will usually trigger searches directly in response to calls to
	 * `setSearch`.
	 * @returns A promise that resolves when the search request has been completed.
	 */
	search(cancellationToken?: CancelToken): Promise<void>;

	/**
	 * Configures the next search request that will be executed. This will also execute a search in response to
	 * the next search request changing.
	 * @param search The partial search request object. This will be merged with previous calls to `setSearch`.
	 * @param doHistory Whether or not this search request will push a history entry into the browser. If
	 * 					not specified, the default is `true`.
	 */
	setSearch(search: Partial<Request>, doHistory?: boolean, fromInput?: boolean): void;
	/**
	 * Toggles a facet value for the next search request that will be executed. If the given facet had previously
	 * been selected, it will be unselected. If the negation state of a selected facet is changed, the selection
	 * will have its negation state changed. Internally, this will call `setSearch` to configure the next search
	 * with this selected facet.
	 * @param facet The facet for which the value is being selected.
	 * @param facetValue The facet value being selected.
	 * @param negate  Whether or not this selection is considered a negation.
	 */
	toggleFacetValue(
		facet: Facet | string,
		facetValue: Value | string,
		negate?: boolean,
		request?: ClientIdRequest,
		symbolForNegate?: string
	): void;

	setFacetValues(facet: Facet | string, facetValues: Value[] | string[]): void;

	/**
	 * Entirely clears all the values of the given facet from the current selection.
	 * @param facet The facet to clear.
	 */
	clearFacet(facet: Facet | string): void;

	/**
	 * Clears a given facet value of the given facet from the current selection.
	 * @param facet The facet to clear.
	 * @param facetValue The facet value to clear.
	 */
	clearFacetValue(facet: Facet | string, facetValue?: Value | string): void;

	/**
	 * Clears all selected facets from the current selection.
	 */
	clearAllFacets(): void;

	// Store items to make comparision via request
	setItemsToCompare(resultItem: Result, isCheck: boolean): void;

	// To store items after getting the results from compare request
	setComparedResults(comparedResults: Result[]): void;

	// To store items after getting the results from compare request
	setProductDetailsResults(detailsResult: Result): void;

	// Clear stored compared items
	clearItemsToCompare(): void;

	// Get comparision of items from request
	getComparedItems(request: CompareItemRequest, cancellationToken?: CancelToken): Promise<CompareDataResponse>;

	// Pin items
	pinItem(payload: PinItemRequest, cancellationToken?: CancelToken): Promise<string | null>;

	// update sorting order of pinned items
	updatePinOrder(payload: SortingOrderRequest, cancellationToken?: CancelToken): Promise<string | null>;

	// rebuild Index
	rebuildIndex(request: RebuildIndexRequest, cancellationToken?: CancelToken): Promise<string | null>;

	// Get product details
	getProductDetails(request: ProductDetailsRequest, cancellationToken?: CancelToken): Promise<ProductDetailsResponse>;

	setStore(store: SearchStore): void;

	setPreviewDate(previewDate: string): void;

	setSmartBar(data: { [key: string]: string }): void;

	getLandingPageData(request: ClientIdRequest): object;

	getClientData(): ClientData;
}

export function useHawkState(initialSearch?: Partial<Request>): [SearchStore, SearchActor] {
	const { config } = useHawkConfig();

	const client = new HawkClient(config);

	const [store, setStore] = useMergableState(
		new SearchStore({
			pendingSearch: initialSearch || {},
			isLoading: true,
			isLandingPageExpired: false,
			negativeFacetValuePrefix: '',
			itemsToCompare: [],
			comparedResults: [],
			itemsToCompareIds: [],
			previewDate: '',
			productDetails: {},
			language: getInitialLanguage(),
			smartBar: {},
			IsAutocompleteRecommendationEnabled: false,
		}),
		SearchStore
	);

	useEffect(() => {
		// when the pending search changes, trigger a search

		const cts = axios.CancelToken.source();

		if (Object.keys(store.pendingSearch).length) {
			search(cts.token);
		}

		return () => {
			cts.cancel();
		};
	}, [store.pendingSearch]);

	/**
	 * Performs a search with the currently configured pending search request. The search request can be
	 * configured via the `setSearch` method. This method usually doesn't need to be called directly, as
	 * the `StoreProvider` component will usually trigger searches directly in response to calls to
	 * `setSearch`.
	 * @returns A promise that resolves when the search request has been completed.
	 */
	async function search(cancellationToken?: CancelToken): Promise<void> {
		setStore({ isLoading: true });

		let searchResults: Response | null = null;
		let parsedLocation = parseLocation(location, config.siteDirectory ? config.siteDirectory : '');
		const searchParams = {
			// the search request being executed is spread from the pendingSearch
			...store.pendingSearch,
			// pass parameter for extended response
			IsInPreview: config.isInPreview,
			// and override some of the request fields with config values
			ClientGuid: config.clientGuid,
			ClientData: getClientData(),
			Keyword: store.pendingSearch.Keyword
				? decodeURIComponent(store.pendingSearch.Keyword || '')
				: store.pendingSearch.Keyword,
			SearchWithin: store.pendingSearch.SearchWithin
				? decodeURIComponent(decodeURIComponent(store.pendingSearch.SearchWithin || ''))
				: store.pendingSearch.SearchWithin,
			SmartBar: store.pendingSearch.SmartBar,
		};

		if(parsedLocation.CustomUrl) {
			Object.assign(searchParams, { CustomUrl: parsedLocation.CustomUrl });
		}

		// The index name in the configuration takes priority over the one supplied from the URL
		if (config.indexName) {
			Object.assign(searchParams, { IndexName: config.indexName });
		}

		// If the index name is required and no value is provided from the config or the URL, the request is canceled
		if (config.indexNameRequired && !searchParams.IndexName) {
			setStore({ isLoading: false });
			return;
		}

		try {
			searchResults = await client.search(searchParams, cancellationToken);
		} catch (error) {
			if (axios.isCancel(error)) {
				// if the request was cancelled, it's because this component was updated
				return;
			}

			console.error('Search request error:', error);
			setStore({ requestError: true });
		}

		setStore({ isLoading: false });

		if (searchResults) {
			if (!searchResults.Success) {
				console.error('Search result error:', searchResults);
				setStore({ requestError: true });
			} else {
				const selectedFacets = searchParams.FacetSelections ? Object.keys(searchParams.FacetSelections) : [];

				TrackingEvent.setLanguage(store.language);

				if (
					searchParams.SortBy ||
					searchParams.PageNo ||
					searchParams.MaxPerPage ||
					selectedFacets.length ||
					searchParams.SearchWithin
				) {
					TrackingEvent.track('searchtracking', {
						trackingId: searchResults.TrackingId,
						typeId: SearchType.Refinement,
						keyword: searchParams.Keyword,
					});
				} else {
					TrackingEvent.track('searchtracking', {
						trackingId: searchResults.TrackingId,
						typeId: SearchType.Initial,
						keyword: searchParams.Keyword,
					});
				}

				setStore({
					searchResults: new Response(searchResults),
					requestError: false,
				});
			}
		} else {
			return;
		}
	}

	/**
	 * Performs a comparision between two or more than two products based on ID
	 * user can use this method from view application.
	 * @returns A promise that resolves when the compare request has been completed.
	 */
	async function getComparedItems(
		request: CompareItemRequest,
		cancellationToken?: CancelToken
	): Promise<CompareDataResponse> {
		return await client.getComparedItems(request, cancellationToken);
	}

	async function pinItem(request: PinItemRequest, cancellationToken?: CancelToken): Promise<string | null> {
		return await client.pinItem(request, cancellationToken);
	}

	async function updatePinOrder(
		request: SortingOrderRequest,
		cancellationToken?: CancelToken
	): Promise<string | null> {
		return await client.updatePinOrder(request, cancellationToken);
	}

	async function rebuildIndex(request: RebuildIndexRequest, cancellationToken?: CancelToken): Promise<string | null> {
		return await client.rebuildIndex(request);
	}

	/**
	 * Get product details by ID
	 * @returns A promise that resolves when the product details request has been completed.
	 */
	async function getProductDetails(
		request: ProductDetailsRequest,
		cancellationToken?: CancelToken
	): Promise<ProductDetailsResponse> {
		return await client.getProductDetails(request, cancellationToken);
	}

	async function getLandingPageData(request: ClientIdRequest) {
		const searchParams = new URLSearchParams(window.location.search);
		const checkParams = searchParams.has('lp') ? searchParams.get('lp') : searchParams.get('PageId');
		const landingPageResults = await client.getLandingPage(checkParams, request);
		const isLandingPageExpired: boolean = landingPageResults?.IsLandingPageExpired;
		if (isLandingPageExpired !== undefined) {
			setStore({ isLandingPageExpired });
		}
		const negativeFacetValuePrefix: string = landingPageResults?.NegativeFacetValuePrefix
			? landingPageResults.NegativeFacetValuePrefix
			: '-';
		if (negativeFacetValuePrefix !== undefined) {
			setStore({ negativeFacetValuePrefix });
		}
		const IsAutocompleteRecommendationEnabled: boolean = landingPageResults?.IsAutocompleteRecommendationEnabled;
		if (IsAutocompleteRecommendationEnabled !== undefined) {
			setStore({ IsAutocompleteRecommendationEnabled });
		}
	}

	/**
	 * Configures the next search request that will be executed. This will also execute a search in response to
	 * the next search request changing.
	 * @param search The partial search request object. This will be merged with previous calls to `setSearch`.
	 * @param doHistory Whether or not this search request will push a history entry into the browser. If
	 * 					not specified, the default is `true`.
	 */
	function setSearch(pendingSearch: Partial<Request>, doHistory?: boolean, fromInput?: boolean): void {
		if (doHistory === undefined) {
			doHistory = true;
		}

		// Check if any additional parameters, besides the keyword, are required.
		// If the configuration is set and the search is triggered from user input
		// only the entered term is used for the request.
		const removeSearchParams = config.removeSearchParams && fromInput;

		setStore(prevState => {
			/** 
				const tab = prevState.searchResults?.Facets.find(f => f.FieldType === 'tab');
				const facetValue = (tab || {}).Values ? tab?.Values.find(v => v.Selected) : undefined;

				if (
					!removeSearchParams &&
					tab?.Field &&
					!(pendingSearch.FacetSelections || {})[tab.Field] &&
					facetValue?.Value
				) {
					pendingSearch = {
						...pendingSearch,
						FacetSelections: {
							...pendingSearch.FacetSelections,
							[tab.Field]: [facetValue.Value],
						},
					};
				}
			*/
			const newState = {
				pendingSearch: removeSearchParams ? pendingSearch : { ...prevState.pendingSearch, ...pendingSearch },
				doHistory,
			};

			if (newState.pendingSearch.Keyword === '') {
				newState.pendingSearch.Keyword = undefined;
			} else if (pendingSearch.Keyword !== undefined) {
				setRecentSearch(config.siteDirectory, pendingSearch.Keyword);
			}
			
			return newState;
		});
	}

	/**
	 * Sets the facet selections and search within configuration for the next search request. This will also
	 * clear the page number of the next request to display the first page of results.
	 * @param selections The facet selections to set.
	 * @param searchWithin The search within value to set.
	 */
	function setSearchSelections(selections?: FacetSelections, searchWithin?: string) {
		setSearch({
			FacetSelections: selections,
			SearchWithin: searchWithin,

			// when we change facet selections, also clear the current page so that we navigate
			// back to the first page of results
			PageNo: undefined,
		});
	}

	// NOTE: It will return the difference from 1st array
	// i.e ['a', 'b', 'c'] - ['c', 'd', 'f'] => ['a', 'b']
	function differenceOfArrays(array1: string[], array2: string[]) {
		return array1.filter(i => {
			return array2.indexOf(i) < 0;
		});
	}

	/**
	 * Toggles a facet value for the next search request that will be executed. Internally, this will call
	 * `setSearch` to configure the next search with this selected facet.
	 * @param facet The facet for which the value is being selected.
	 * @param facetValue The facet value being selected.
	 * @param negate  Whether or not this selection is considered a negation.
	 */
	function toggleFacetValue(
		facet: Facet | string,
		facetValue: Value | string,
		negate?: boolean,
		request?: ClientIdRequest,
		symbolForNegate?: string
	): void {
		if (negate === undefined) {
			negate = false;
		}

		const facetName: string = typeof facet === 'string' ? facet : facet.Name;
		const facetField = typeof facet === 'string' ? facet : facet.selectionField;

		const valueValue = typeof facetValue === 'string' ? facetValue : facetValue.Value;
		const valueLabel = typeof facetValue === 'string' ? facetValue : facetValue.Label;

		if (!valueValue) {
			console.error(`Facet ${facetName} (${facetField}) has no facet value for ${valueLabel}`);
			return;
		}

		let facetSelections = store.pendingSearch.FacetSelections;

		// handle `searchWithin` facet, which isn't a facet selection but is instead a field on the
		// search request.
		if (facetField === 'searchWithin') {
			// set the search within to the facet value provided
			setSearchSelections(facetSelections, /* searchWithin */ valueValue);

			return;
		}

		if (!facetSelections) {
			facetSelections = {};
		}

		if (!facetSelections[facetField]) {
			facetSelections[facetField] = [];
		}

		const { state: selState, selectionIndex } = store.isFacetSelected(facet, facetValue, symbolForNegate);
		const valuesToRemoved = [] as string[];
		const items = (store.facetSelections[facetField] || {}).items || [];

		items.forEach((item: ClientSelectionValue) => {
			if (((item || {}).path || '').indexOf(valueValue) !== -1) {
				valuesToRemoved.push(item.value);
			}
		});
				
		const selectionValue = negate ? `${symbolForNegate}${valueValue}` : valueValue;

		if(selectionIndex !== undefined) {
			facetSelections[facetField]!.splice(selectionIndex, 1);
		} else {
			if ((facet as Facet).FacetType === FacetType.NestedCheckbox) {
				if (!Object(facetValue)?.Children?.length && !negate) {
					handleSelectionOfNestedFacet(facet, facetValue, facetSelections);
				}
				if (negate && symbolForNegate) {
					removeExcludedSelectionInHierarchy(facet, facetValue, facetSelections, symbolForNegate);
				}
				facetSelections[facetField]!.push(selectionValue);
			} else {
				facetSelections[facetField]!.push(selectionValue);
			}
		}

		if (facetSelections[facetField]!.length === 0) {
			// clean up any facets that no longer have any selected facet values
			delete facetSelections[facetField];
		}

		setSearchSelections(facetSelections, store.pendingSearch.SearchWithin);
	}

	function removeExcludedSelectionInHierarchy(facet: Facet | string, facetValue: Value | string, facetSelections: FacetSelections | [], symbolForNegate: string) {
		const facetPath = Object(facetValue).Path;
		const selectedFacetValues = Object(facet).Values;
		if (facet) {
			const facetField = typeof facet === 'string' ? facet : facet.selectionField;
			function children(selectedFacetValues) {
				selectedFacetValues.forEach((values) => {
					if (values.Children.length > 0) {
						const findSelectedValues = values.Children.filter(findChild => facetSelections[facetField].includes(`${symbolForNegate}${findChild.Value}`));
						if (findSelectedValues.length) {
							findSelectedValues.forEach((findSelectedValue) => {
								if (facetPath.indexOf(findSelectedValue.Path) === 0 || findSelectedValue.Path.indexOf(facetPath) === 0) {
									const findIndex = facetSelections[facetField].indexOf(`${symbolForNegate}${findSelectedValue.Value}`);
									facetSelections[facetField]?.splice(findIndex, 1);
								}
							})
						}
						if (facetSelections[facetField].length && values.Children) {
							children(values.Children)
						}
					}
				})
			}
			children(selectedFacetValues)
		}
	}

	function handleSelectionOfNestedFacet(
		facet: Facet | string,
		facetValue: Value | string,
		facetSelections: FacetSelections | []
	) {
		const values: Value[] = Object(facet).Values;

		if (facet) {
			function children(selectedFacetValues: Value[]) {
				selectedFacetValues.forEach(value => {
					if (value.Children.length > 0) {
						const findSelectedValue = value.Children.find(
							findChild => findChild.Value === Object(facetValue).Value
						);
						if (findSelectedValue === undefined) {
							children(value.Children);
						} else {
							const facetField = typeof facet === 'string' ? facet : facet.selectionField;
							facetSelections[facetField].forEach(element => {
								const findIndex = facetSelections[facetField].indexOf(element);
								const parentInChildren = value.Children.find(findChild => findChild.Value === element);
								if (parentInChildren === undefined) {
									facetSelections[facetField]?.splice(findIndex);
								}
							});

							return;
						}
					}
				});
			}

			children(values);
		}
	}

	function setFacetValues(facet: Facet | string, facetValues: Value[] | string[]): void {
		const facetName = typeof facet === 'string' ? facet : facet.Name;
		const facetField = typeof facet === 'string' ? facet : facet.selectionField;

		let facetSelections = store.pendingSearch.FacetSelections;

		if (!facetSelections) {
			facetSelections = {};
		}

		facetSelections[facetField] = [];

		for (const facetValue of facetValues) {
			const valueValue = typeof facetValue === 'string' ? facetValue : facetValue.Value;
			const valueLabel = typeof facetValue === 'string' ? facetValue : facetValue.Label;

			if (!valueValue) {
				console.error(`Facet ${facetName} (${facetField}) has no facet value for ${valueLabel}`);
				return;
			}

			facetSelections[facetField]!.push(valueValue);
		}

		setSearchSelections(facetSelections, store.pendingSearch.SearchWithin);
	}

	/**
	 * Entirely clears all the values of the given facet from the current selection.
	 * @param facet The facet to clear.
	 */
	function clearFacet(facet: Facet | string) {
		const facetField = typeof facet === 'string' ? facet : facet.selectionField;

		const facetSelections = store.pendingSearch.FacetSelections;

		// handle `searchWithin` facet, which isn't a facet selection but is instead a field on the
		// search request.
		if (facetField === 'searchWithin') {
			// set searchWithin to undefined to clear it
			setSearchSelections(facetSelections, /* searchWithin */ undefined);

			return;
		}

		if (!facetSelections || !facetSelections[facetField]) {
			// if there are no facet selections or the facet isn't selected at all, there's nothing to clear
			return;
		}

		delete facetSelections[facetField];

		setSearchSelections(facetSelections, store.pendingSearch.SearchWithin);
	}

	/**
	 * Clears a given facet value of the given facet from the current selection.
	 * @param facet The facet to clear.
	 * @param facetValue The facet value to clear.
	 */
	function clearFacetValue(facet: Facet | string, facetValue: Value | string) {
		const facetName = typeof facet === 'string' ? facet : facet.Name;
		const facetField = typeof facet === 'string' ? facet : facet.selectionField;

		const valueValue = typeof facetValue === 'string' ? facetValue : facetValue.Value;
		const valueLabel = typeof facetValue === 'string' ? facetValue : facetValue.Label;

		if (!valueValue) {
			console.error(`Facet ${facetName} (${facetField}) has no facet value for ${valueLabel}`);
			return;
		}

		// handle `searchWithin` facet, which isn't a facet selection but is instead a field on the
		// search request.
		if (facetField === 'searchWithin') {
			// set searchWithin to undefined to clear it
			setSearchSelections(store.pendingSearch.FacetSelections, /* searchWithin */ undefined);

			return;
		}

		const { state: selState, selectionIndex } = store.isFacetSelected(facet, facetValue);

		if (selState === FacetSelectionState.NotSelected) {
			// if there are no facet selections or the facet isn't selected at all, there's nothing to clear
			return;
		}

		const facetSelections = store.pendingSearch.FacetSelections!;

		// remove it from the selections
		facetSelections[facetField]!.splice(selectionIndex!, 1);

		if (facetSelections[facetField]!.length === 0) {
			// clean up any facets that no longer have any selected facet values
			delete facetSelections[facetField];
		}

		setSearchSelections(facetSelections, store.pendingSearch.SearchWithin);
	}

	/**
	 * Clears all selected facets from the current selection.
	 */
	function clearAllFacets(): void {
		setSearchSelections(undefined, undefined);
	}

	function setItemsToCompare(resultItem: Result, isCheck: boolean): void {
		let itemsArray = [...store.itemsToCompare];
		if (isCheck) {
			// append
			itemsArray = [...itemsArray, ...[resultItem]];
		} else {
			// filter out
			itemsArray = itemsArray.filter(item => item.DocId !== resultItem.DocId);
		}
		// setStore({ itemsToCompare: itemsArray });
		setStore({
			itemsToCompare: itemsArray,
			itemsToCompareIds: itemsArray.map(item => item.DocId),
		});
	}

	function setComparedResults(data: Result[]): void {
		setStore({
			comparedResults: data,
		});
	}

	function setProductDetailsResults(data: Result): void {
		setStore({
			productDetails: data,
		});
	}

	function clearItemsToCompare() {
		setStore({
			itemsToCompare: [],
			itemsToCompareIds: [],
		});
	}

	function setPreviewDate(previewDate: string) {
		setStore({
			previewDate,
		});
	}

	function getClientData() {
		let visitId = getCookie('hawk_visit_id');
		let visitorId = getCookie('hawk_visitor_id');

		if (!visitId) {
			setCookie('hawk_visit_id', createGuid(), getVisitExpiry());
			visitId = getCookie('hawk_visit_id');
		}

		if (!visitorId) {
			setCookie('hawk_visitor_id', createGuid(), getVisitorExpiry());
			visitorId = getCookie('hawk_visitor_id');
		}

		let clientData: ClientData = {
			VisitorId: visitorId || '',
			VisitId: visitId || '',
			UserAgent: navigator.userAgent,
			PreviewBuckets:
				store.searchResults && !config.disablePreviewBuckets
					? store.searchResults.VisitorTargets.map(v => v.Id)
					: [],
		};
		if (store.pendingSearch.ClientData) {
			clientData = {
				...clientData,
				PreviewBuckets: store.pendingSearch.ClientData.PreviewBuckets,
			};
		}
		const language = store.language;

		if (language) {
			clientData.Custom = {
				language,
			};
		}

		return clientData;
	}

	function getInitialLanguage() {
		const urlParams = new URLSearchParams(location.search);
		const language = urlParams.get('language') || config.language;
		return language;
	}

	function setSmartBar(data: { [key: string]: string }): void {
		setStore({
			smartBar: data,
		});
	}

	const actor: SearchActor = {
		search,
		setSearch,
		toggleFacetValue,
		setFacetValues,
		clearFacet,
		clearFacetValue,
		clearAllFacets,
		setItemsToCompare,
		setComparedResults,
		clearItemsToCompare,
		getComparedItems,
		pinItem,
		updatePinOrder,
		rebuildIndex,
		getProductDetails,
		setProductDetailsResults,
		setStore,
		setPreviewDate,
		setSmartBar,
		getLandingPageData,
		getClientData,
	};

	return [store, actor];
}
