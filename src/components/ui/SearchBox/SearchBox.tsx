import React, { useState } from 'react';
import { ControllerStateAndHelpers } from 'downshift';
import UploadModal from '../ImageSearch/UploadModal';
import { useHawksearch } from 'components/StoreProvider';
import SearchBoxBase from 'components/ui/SearchBox/SearchBoxBase';
import { Product } from 'models/Autocomplete';
import { CustomSuggestionListProps } from 'components/ui/AutoComplete/CustomSuggestionList';

interface SearchBoxProps {
  SuggestionList?: React.ComponentType<CustomSuggestionListProps>;
}

function SearchBox({ SuggestionList }: SearchBoxProps) {
  const { store, actor } = useHawksearch();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text'); // Track current search mode

  function handleSubmit(event: React.KeyboardEvent<HTMLInputElement>, downshift: ControllerStateAndHelpers<Product>) {
    if (searchMode !== 'text') {
      setSearchMode('text'); // Switch to text mode
    }

    const keyword = event.currentTarget.value.trim();
    if (event.key === 'Enter' && keyword.length) {
      actor.setSearch(
        {
          RequestType: 'KeywordSearch', // Set RequestType for text search
          Keyword: encodeURIComponent(keyword),
          IgnoreSpellcheck: false,
        },
        true,
        true
      );
    }
  }

  function handleViewAllMatches(inputValue: string) {
    if (searchMode !== 'text') {
      setSearchMode('text'); // Switch to text mode
    }

    actor.setSearch(
      {
        RequestType: 'KeywordSearch', // Set RequestType for text search
        PageId: undefined,
        CustomUrl: undefined,
        Keyword: inputValue || '',
      },
      true,
      true
    );
  }

  function handleImageSearch(base64Image: string) {
    if (searchMode !== 'image') {
      setSearchMode('image'); // Switch to image mode
    }

    actor.setSearch(
      {
        RequestType: 'ImageSearch', // Set RequestType for image search
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
      
      <SearchBoxBase
        onViewMatches={(downshift) => handleViewAllMatches(downshift.inputValue || '')}
        initialValue={store && store.pendingSearch ? store.pendingSearch.Keyword : ''}
        onSubmit={handleSubmit}
        SuggestionList={SuggestionList}
      />
	  <button
        onClick={() => {
          resetSearchState(); // Clear previous search data
          setSearchMode('image'); // Switch to image mode
          setModalOpen(true);
        }}
      >
        Image
      </button>
      {isModalOpen && (
        <UploadModal
          onClose={() => {
            setModalOpen(false);
            setSearchMode('text'); // Reset to text mode on modal close
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
