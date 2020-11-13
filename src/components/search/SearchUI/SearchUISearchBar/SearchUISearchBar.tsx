import React, { useState, useEffect } from 'react';
import { MaterialsInput } from '../../MaterialsInput';
import { useSearchUIContext, useSearchUIContextActions } from '../SearchUIContextProvider';
import { MaterialsInputField } from '../../MaterialsInput';

/**
 * A specific version of the MaterialsInput component used within the SearchUI component
 * for performing top level searches by mp-id, formula, or elements.
 * The input value is parsed into its appropriate search field upon submission.
 */

export const SearchUISearchBar: React.FC = () => {
  const actions = useSearchUIContextActions();
  const state = useSearchUIContext();
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchParsedValue, setSearchParsedValue] = useState<string | string[]>('');
  const [searchField, setSearchField] = useState<string>(state.topLevelSearchField);

  const getFieldsToOverride = (selectedField: string) => {
    let fields: string[] = [];
    Object.values(MaterialsInputField).forEach((field) => {
      if (field !== selectedField) fields.push(field);
    });
    return fields;
  };

  // useEffect(() => {
  //   setSearchField(state.topLevelSearchField);
  //   setSearchValue(state.filterValues[state.topLevelSearchField]);
  // }, [state.topLevelSearchField]);

  return (
    <MaterialsInput
      value={searchValue}
      parsedValue={searchParsedValue}
      field={searchField}
      onChange={v => setSearchValue(v)}
      onFieldChange={field => setSearchField(field)}
      onSubmit={() => actions.setFilterWithOverrides(searchValue, searchField, getFieldsToOverride(searchField))}
      periodicTableMode="toggle"
    />
  );
};
