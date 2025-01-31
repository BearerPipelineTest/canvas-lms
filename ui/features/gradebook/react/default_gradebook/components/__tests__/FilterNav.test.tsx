/*
 * Copyright (C) 2021 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import FilterNav from '../FilterNav'
import fetchMock from 'fetch-mock'
import store from '../../stores/index'
import type {FilterNavProps} from '../FilterNav'
import type {FilterPreset, Filter} from '../../gradebook.d'
import {render, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/extend-expect'

const originalState = store.getState()

const defaultProps: FilterNavProps = {
  modules: [
    {id: '1', name: 'Module 1', position: 1},
    {id: '2', name: 'Module 2', position: 2},
    {id: '3', name: 'Module 3', position: 3}
  ],
  assignmentGroups: [
    {id: '4', name: 'Assignment Group 4', position: 1, group_weight: 0, assignments: []},
    {id: '5', name: 'Assignment Group 5', position: 2, group_weight: 0, assignments: []},
    {id: '6', name: 'Assignment Group 6', position: 3, group_weight: 0, assignments: []}
  ],
  sections: [
    {id: '7', name: 'Section 7'},
    {id: '8', name: 'Section 8'},
    {id: '9', name: 'Section 9'}
  ],
  gradingPeriods: [
    {id: '1', title: 'Grading Period 1', startDate: 1},
    {id: '2', title: 'Grading Period 2', startDate: 2},
    {id: '3', title: 'Grading Period 3', startDate: 3}
  ],
  studentGroupCategories: {
    '1': {
      id: '1',
      name: 'Student Group Category 1',
      groups: [
        {id: '1', name: 'Student Group 1'},
        {id: '2', name: 'Student Group 2'}
      ]
    }
  }
}

const defaultAppliedFilters: Filter[] = [
  {
    id: '2',
    type: 'module',
    value: '1',
    created_at: new Date().toISOString()
  }
]

const defaultFilterPresets: FilterPreset[] = [
  {
    id: 'preset-1',
    name: 'Filter Preset 1',
    filters: [
      {
        id: '2',
        type: 'module',
        value: '1',
        created_at: '2022-02-05T10:18:34-07:00'
      }
    ],
    created_at: '2022-02-05T10:18:34-07:00'
  },
  {
    id: 'preset-2',
    name: 'Filter Preset 2',
    filters: [
      {
        id: '3',
        type: 'section',
        value: '7',
        created_at: new Date().toISOString()
      }
    ],
    created_at: '2022-02-06T10:18:34-07:00'
  }
]

const mockPostResponse = {
  gradebook_filter: {
    id: '25',
    course_id: '0',
    user_id: '1',
    name: 'test',
    payload: {
      filters: [
        {
          id: 'f783e528-dbb5-4474-972a-0f1a19c29551',
          type: 'section',
          value: '2',
          created_at: '2022-02-08T17:18:13.190Z'
        }
      ]
    },
    created_at: '2022-02-08T10:18:34-07:00',
    updated_at: '2022-02-08T10:18:34-07:00'
  }
}

describe('FilterNav', () => {
  beforeEach(() => {
    store.setState({
      filterPresets: defaultFilterPresets,
      appliedFilters: defaultAppliedFilters
    })
    fetchMock.mock('*', 200)
  })
  afterEach(() => {
    store.setState(originalState, true)
    fetchMock.restore()
  })

  it('renders filters button', async () => {
    const {getByRole} = render(<FilterNav {...defaultProps} />)
    await getByRole('button', {name: 'Apply Filters'})
  })

  it('render condition tag for applied staged filter', async () => {
    store.setState({
      stagedFilters: [
        {
          id: '4',
          type: 'module',
          value: '1',
          created_at: new Date().toISOString()
        },
        {
          id: '5',
          type: undefined,
          value: undefined,
          created_at: new Date().toISOString()
        }
      ]
    })
    const {getAllByTestId} = render(<FilterNav {...defaultProps} />)
    expect(await getAllByTestId('applied-filter-tag')[0]).toHaveTextContent('Module 1')
  })

  it('opens tray', () => {
    const {getByText, getByRole} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    expect(getByRole('heading')).toHaveTextContent('Gradebook Filter Presets')
  })

  it('shows friendly panda image when there are no filters', async () => {
    store.setState({filterPresets: [], stagedFilters: []})
    const {getByAltText, getByText} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    expect(await getByAltText('Friendly panda')).toBeInTheDocument()
  })

  it('hides friendly panda image when there are filters', async () => {
    const {queryByAltText, getByText} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    expect(await queryByAltText('Friendly panda')).toBeNull()
  })

  it('renders new filter button', () => {
    const {getByText, getByTestId} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    expect(getByTestId('new-filter-button')).toBeInTheDocument()
  })

  it('clicking Create New Filter Preset triggers onChange with filter', async () => {
    store.setState({filterPresets: []})
    const {getByText, queryByTestId, getByTestId} = render(<FilterNav {...defaultProps} />)
    expect(queryByTestId('save-filter-button')).toBeNull()
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    userEvent.click(getByTestId('new-filter-button'))
    expect(getByTestId('save-filter-button')).toBeVisible()
  })
})

describe('Filter dropdown', () => {
  beforeEach(() => {
    store.setState({
      filterPresets: defaultFilterPresets,
      appliedFilters: []
    })
    fetchMock.mock('*', 200)
  })
  afterEach(() => {
    store.setState(originalState, true)
    fetchMock.restore()
  })

  it('Shows filter menu items', async () => {
    const {getByText} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    expect(getByText('Filter Preset 1')).toBeVisible()
    expect(getByText('Filter Preset 2')).toBeVisible()
    expect(getByText('Sections')).toBeVisible()
    expect(getByText('Modules')).toBeVisible()
    expect(getByText('Grading Periods')).toBeVisible()
    expect(getByText('Assignment Groups')).toBeVisible()
    expect(getByText('Student Groups')).toBeVisible()
  })

  it('Clicking filter preset activates condition', async () => {
    const {getByText, getByTestId, queryByTestId} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Filter Preset 1'))
    expect(getByTestId('applied-filter-tag')).toBeVisible()
    userEvent.click(getByText('Filter Preset 1'))
    expect(queryByTestId('applied-filter-tag')).toBeNull()
  })

  it('Clicking filter activates condition', async () => {
    const {getByText, getByTestId, queryByTestId} = render(<FilterNav {...defaultProps} />)
    expect(queryByTestId('applied-filter-tag')).toBeNull()
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Sections'))
    userEvent.click(getByText('Section 7'))
    expect(getByTestId('applied-filter-tag')).toBeVisible()
  })
})

describe('FilterNav (save)', () => {
  beforeEach(() => {
    store.setState({
      filterPresets: defaultFilterPresets,
      appliedFilters: defaultAppliedFilters
    })
    fetchMock.post('/api/v1/courses/0/gradebook_filters', mockPostResponse)
  })
  afterEach(() => {
    store.setState(originalState, true)
    fetchMock.restore()
  })

  it('Save button is disabled if filter preset name is blank', async () => {
    const {getByText, getByTestId, getAllByTestId} = render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    userEvent.click(getByTestId('new-filter-button'))
    expect(getAllByTestId('save-filter-button')[2]).toBeDisabled()
  })

  it('clicking Save saves new filter', async () => {
    const {getByText, queryAllByTestId, getAllByPlaceholderText, getByTestId, getAllByTestId} =
      render(<FilterNav {...defaultProps} />)
    userEvent.click(getByText('Apply Filters'))
    userEvent.click(getByText('Create & Manage Filter Presets'))
    userEvent.click(getByTestId('new-filter-button'))
    // https://github.com/testing-library/user-event/issues/577
    // type() is very slow, so use paste() instead since we don't need to test anything specific to typing
    userEvent.paste(
      getAllByPlaceholderText('Give your filter preset a name')[2],
      'Sample filter preset name'
    )
    expect(getAllByTestId('delete-filter-preset-button')[2]).toBeVisible()
    userEvent.click(getAllByTestId('save-filter-button')[2])
    await waitFor(() => expect(queryAllByTestId('save-filter-button')[2]).toBeDisabled())
  })
})
