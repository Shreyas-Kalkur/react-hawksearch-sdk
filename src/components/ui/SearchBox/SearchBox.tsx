import React, { useState } from 'react';
import { ControllerStateAndHelpers } from 'downshift';
import UploadModal from '../ImageSearch/UploadModal';
import { useHawksearch } from 'components/StoreProvider';
import SearchBoxBase from 'components/ui/SearchBox/SearchBoxBase';
import { Product } from 'models/Autocomplete';
import { CustomSuggestionListProps } from 'components/ui/AutoComplete/CustomSuggestionList';
import CameraIcon from 'components/svg/CameraIcon';

interface SearchBoxProps {
  SuggestionList?: React.ComponentType<CustomSuggestionListProps>;
}

function SearchBox({ SuggestionList }: SearchBoxProps) {
  const { store, actor } = useHawksearch();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'keyword' | 'concept' | 'image'>('keyword');

  function handleSubmit(event: React.KeyboardEvent<HTMLInputElement>,/* downshift: ControllerStateAndHelpers<Product>*/) {
    const keyword = event.currentTarget.value.trim();
    if (event.key === 'Enter' && keyword.length) {
      const requestType = searchMode === 'concept' ? 'ConceptSearch' : 'KeywordSearch';
      actor.setSearch(
        {
          RequestType: requestType,
          Keyword: encodeURIComponent(keyword),
          IgnoreSpellcheck: false,
        },
        true,
        true
      );
    }
  }

  function handleImageSearch(base64Image: string) {
    setSearchMode('image');
    actor.setSearch(
      {
        RequestType: 'ImageSearch',
        ImageData: `data:image/png;base64,${base64Image}`,
      },
      true,
      true
    );
  }

  function resetSearchState() {
    actor.setSearch(
      {
        RequestType: '',
        Keyword: '',
        PageId: undefined,
        CustomUrl: undefined,
        ImageData: undefined,
      },
      false,
      false
    );
  }

  return (
    <div className="hawk__searchBox">
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={searchMode === 'concept' ? 'Search by Concept' : 'Search by Keyword'}
            onKeyDown={handleSubmit}
            defaultValue={store && store.pendingSearch ? store.pendingSearch.Keyword : ''}
          />
          <button
            className="toggle-button"
            onClick={() => {
              resetSearchState();
              setSearchMode(searchMode === 'concept' ? 'keyword' : 'concept');
            }}
          >
            or {searchMode === 'concept' ? 'Keyword' : 'Concepts'}
          </button>
        </div>
        <button
          className="image-button"
          onClick={() => {
            resetSearchState();
            setSearchMode('image');
            setModalOpen(true);
          }}
        >
          <CameraIcon className="camera-icon" />
        </button>
      </div>

      {isModalOpen && (
        <UploadModal
          onClose={() => {
            setModalOpen(false);
            setSearchMode('keyword');
          }}
          onUpload={(base64String) => {
            console.log('Uploaded image data:', base64String);
            handleImageSearch(base64String);
          }}
        />
      )}
    </div>
  );
}

export default SearchBox;
