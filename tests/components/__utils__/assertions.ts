/**
 * Custom Test Assertions
 *
 * Domain-specific assertions for component testing
 */

import { screen, within } from '@testing-library/react';

/**
 * Assert that a loading state is present
 */
export function expectLoadingState(): void {
  const loadingElements = screen.queryAllByTestId(/loading/i);
  expect(loadingElements.length).toBeGreaterThan(0);
}

/**
 * Assert that no loading state is present
 */
export function expectNoLoadingState(): void {
  const loadingElements = screen.queryAllByTestId(/loading/i);
  expect(loadingElements.length).toBe(0);
}

/**
 * Assert that an error message is displayed
 */
export function expectErrorMessage(message?: string): void {
  const errorElement = screen.getByRole('alert');
  expect(errorElement).toBeInTheDocument();

  if (message) {
    expect(errorElement).toHaveTextContent(message);
  }
}

/**
 * Assert that no error message is displayed
 */
export function expectNoErrorMessage(): void {
  const errorElement = screen.queryByRole('alert');
  expect(errorElement).not.toBeInTheDocument();
}

/**
 * Assert that a success message is displayed
 */
export function expectSuccessMessage(message?: string): void {
  const successElement = screen.getByTestId(/success/i);
  expect(successElement).toBeInTheDocument();

  if (message) {
    expect(successElement).toHaveTextContent(message);
  }
}

/**
 * Assert that a form field has validation error
 */
export function expectFieldError(fieldName: string, errorMessage?: string): void {
  const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
  expect(field).toHaveAttribute('aria-invalid', 'true');

  if (errorMessage) {
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  }
}

/**
 * Assert that a form field has no validation error
 */
export function expectNoFieldError(fieldName: string): void {
  const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
  expect(field).not.toHaveAttribute('aria-invalid', 'true');
}

/**
 * Assert that a button is in loading state
 */
export function expectButtonLoading(buttonText: string): void {
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
}

/**
 * Assert that a button is not in loading state
 */
export function expectButtonNotLoading(buttonText: string): void {
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  expect(button).not.toBeDisabled();
  expect(button).not.toHaveAttribute('aria-busy', 'true');
}

/**
 * Assert that a modal/dialog is open
 */
export function expectModalOpen(title?: string): void {
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();

  if (title) {
    expect(within(dialog).getByText(title)).toBeInTheDocument();
  }
}

/**
 * Assert that a modal/dialog is closed
 */
export function expectModalClosed(): void {
  const dialog = screen.queryByRole('dialog');
  expect(dialog).not.toBeInTheDocument();
}

/**
 * Assert that an element has specific CSS class
 */
export function expectHasClass(element: HTMLElement, className: string): void {
  expect(element).toHaveClass(className);
}

/**
 * Assert that an element is visible
 */
export function expectVisible(element: HTMLElement): void {
  expect(element).toBeVisible();
}

/**
 * Assert that an element is hidden
 */
export function expectHidden(element: HTMLElement): void {
  expect(element).not.toBeVisible();
}

/**
 * Assert that a tooltip is displayed
 */
export function expectTooltip(content: string): void {
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toBeInTheDocument();
  expect(tooltip).toHaveTextContent(content);
}

/**
 * Assert that navigation occurred
 */
export function expectNavigation(mockPush: jest.Mock, expectedPath: string): void {
  expect(mockPush).toHaveBeenCalledWith(expectedPath);
}

/**
 * Assert that analytics event was tracked
 */
export function expectEventTracked(
  mockTrack: jest.Mock,
  eventName: string,
  properties?: Record<string, any>
): void {
  expect(mockTrack).toHaveBeenCalledWith(eventName, properties);
}

/**
 * Assert that API was called with correct parameters
 */
export function expectApiCall(
  mockFn: jest.Mock,
  expectedUrl: string,
  expectedOptions?: RequestInit
): void {
  expect(mockFn).toHaveBeenCalledWith(expectedUrl, expectedOptions);
}

/**
 * Assert that local storage was updated
 */
export function expectLocalStorageSet(key: string, value?: string): void {
  const storedValue = window.localStorage.getItem(key);
  expect(storedValue).not.toBeNull();

  if (value !== undefined) {
    expect(storedValue).toBe(value);
  }
}

/**
 * Assert that local storage was cleared
 */
export function expectLocalStorageCleared(key: string): void {
  const storedValue = window.localStorage.getItem(key);
  expect(storedValue).toBeNull();
}

/**
 * Assert that a list has specific number of items
 */
export function expectListLength(listRole: string, expectedLength: number): void {
  const list = screen.getByRole(listRole);
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(expectedLength);
}

/**
 * Assert that pagination is displayed
 */
export function expectPagination(currentPage: number, totalPages: number): void {
  const pagination = screen.getByRole('navigation', { name: /pagination/i });
  expect(pagination).toBeInTheDocument();

  const currentPageElement = within(pagination).getByText(currentPage.toString());
  expect(currentPageElement).toHaveAttribute('aria-current', 'page');
}

/**
 * Assert that a table has specific number of rows
 */
export function expectTableRows(expectedRows: number): void {
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row');
  // Subtract 1 for header row
  expect(rows.length - 1).toBe(expectedRows);
}

/**
 * Assert that a badge/chip is displayed with text
 */
export function expectBadge(text: string, variant?: string): void {
  const badge = screen.getByText(text);
  expect(badge).toBeInTheDocument();

  if (variant) {
    expect(badge).toHaveClass(expect.stringContaining(variant));
  }
}

/**
 * Assert that a progress bar shows correct value
 */
export function expectProgressValue(value: number): void {
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toHaveAttribute('aria-valuenow', value.toString());
}

/**
 * Assert that a skeleton loader is displayed
 */
export function expectSkeletonLoader(): void {
  const skeleton = screen.getByTestId(/skeleton/i);
  expect(skeleton).toBeInTheDocument();
}

/**
 * Assert that content is accessible
 */
export function expectAccessibleContent(element: HTMLElement): void {
  expect(element).toHaveAttribute('role');

  const role = element.getAttribute('role');
  if (role === 'button' || role === 'link') {
    expect(element).toHaveAccessibleName();
  }
}

/**
 * Assert that form is valid
 */
export function expectFormValid(): void {
  const form = screen.getByRole('form');
  const invalidFields = within(form).queryAllByAttribute('aria-invalid', 'true');
  expect(invalidFields).toHaveLength(0);
}

/**
 * Assert that form is invalid
 */
export function expectFormInvalid(): void {
  const form = screen.getByRole('form');
  const invalidFields = within(form).queryAllByAttribute('aria-invalid', 'true');
  expect(invalidFields.length).toBeGreaterThan(0);
}

/**
 * Assert that focus is on specific element
 */
export function expectFocusOn(element: HTMLElement): void {
  expect(element).toHaveFocus();
}

/**
 * Assert that image loaded successfully
 */
export function expectImageLoaded(altText: string): void {
  const image = screen.getByAltText(altText) as HTMLImageElement;
  expect(image).toBeInTheDocument();
  expect(image.complete).toBe(true);
  expect(image.naturalHeight).toBeGreaterThan(0);
}

/**
 * Assert that dropdown has specific options
 */
export function expectDropdownOptions(options: string[]): void {
  const combobox = screen.getByRole('combobox');
  const optionElements = within(combobox).getAllByRole('option');

  expect(optionElements).toHaveLength(options.length);
  options.forEach((option, index) => {
    expect(optionElements[index]).toHaveTextContent(option);
  });
}
