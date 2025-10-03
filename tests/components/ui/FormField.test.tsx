/**
 * FormField Components Tests
 * Tests reusable form building blocks with validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
  FormInput,
  FormTextarea,
  useFormValidation,
} from '@/components/ui/FormField';
import '@testing-library/jest-dom';

describe('FormField Components', () => {
  // ===== FormField Tests (10 tests) =====
  describe('FormField', () => {
    it('should render children correctly', () => {
      render(
        <FormField>
          <div>Test Content</div>
        </FormField>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should apply default spacing class', () => {
      const { container } = render(
        <FormField>
          <div>Content</div>
        </FormField>
      );

      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <FormField className="custom-class">
          <div>Content</div>
        </FormField>
      );

      expect(container.firstChild).toHaveClass('custom-class', 'space-y-2');
    });

    it('should render multiple children', () => {
      render(
        <FormField>
          <div>Child 1</div>
          <div>Child 2</div>
        </FormField>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should render nested FormFields', () => {
      render(
        <FormField>
          <FormField>
            <div>Nested Content</div>
          </FormField>
        </FormField>
      );

      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      const { container } = render(<FormField>{null}</FormField>);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with React fragments', () => {
      render(
        <FormField>
          <>
            <div>Fragment 1</div>
            <div>Fragment 2</div>
          </>
        </FormField>
      );

      expect(screen.getByText('Fragment 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment 2')).toBeInTheDocument();
    });

    it('should preserve DOM structure', () => {
      const { container } = render(
        <FormField>
          <div className="child">Content</div>
        </FormField>
      );

      expect(container.querySelector('.child')).toBeInTheDocument();
    });

    it('should merge classNames correctly', () => {
      const { container } = render(
        <FormField className="extra-margin custom-padding">
          <div>Content</div>
        </FormField>
      );

      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('space-y-2');
      expect(element.className).toContain('extra-margin');
      expect(element.className).toContain('custom-padding');
    });

    it('should handle conditional children', () => {
      const showChild = true;
      render(
        <FormField>
          {showChild && <div>Conditional Child</div>}
        </FormField>
      );

      expect(screen.getByText('Conditional Child')).toBeInTheDocument();
    });
  });

  // ===== FormLabel Tests (15 tests) =====
  describe('FormLabel', () => {
    it('should render label text', () => {
      render(<FormLabel>Username</FormLabel>);

      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render as label element', () => {
      render(<FormLabel>Username</FormLabel>);

      const label = screen.getByText('Username');
      expect(label.tagName).toBe('LABEL');
    });

    it('should show required indicator when required=true', () => {
      render(<FormLabel required>Email</FormLabel>);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator when required=false', () => {
      render(<FormLabel required={false}>Email</FormLabel>);

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<FormLabel className="custom-label">Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label).toHaveClass('custom-label');
    });

    it('should apply default styles', () => {
      render(<FormLabel>Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label).toHaveClass('text-sm', 'font-medium');
    });

    it('should support htmlFor attribute', () => {
      render(<FormLabel htmlFor="test-input">Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label).toHaveAttribute('for', 'test-input');
    });

    it('should render required asterisk with correct styling', () => {
      render(<FormLabel required>Label</FormLabel>);

      const asterisk = screen.getByText('*');
      expect(asterisk).toHaveClass('text-destructive', 'ml-1');
    });

    it('should handle custom required indicator', () => {
      const { container } = render(<FormLabel required>Label</FormLabel>);

      const label = container.querySelector('label');
      expect(label?.innerHTML).toContain('*');
    });

    it('should support data attributes', () => {
      render(<FormLabel data-testid="test-label">Label</FormLabel>);

      expect(screen.getByTestId('test-label')).toBeInTheDocument();
    });

    it('should render with children elements', () => {
      render(
        <FormLabel>
          <span>Complex</span> Label
        </FormLabel>
      );

      expect(screen.getByText('Complex')).toBeInTheDocument();
    });

    it('should handle disabled styling', () => {
      render(<FormLabel>Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
    });

    it('should support onClick handler', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<FormLabel onClick={onClick}>Label</FormLabel>);

      await user.click(screen.getByText('Label'));
      expect(onClick).toHaveBeenCalled();
    });

    it('should support id attribute', () => {
      render(<FormLabel id="my-label">Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label).toHaveAttribute('id', 'my-label');
    });

    it('should render with multiple class names', () => {
      render(<FormLabel className="text-lg font-bold text-blue-500">Label</FormLabel>);

      const label = screen.getByText('Label');
      expect(label.className).toContain('text-lg');
      expect(label.className).toContain('font-bold');
      expect(label.className).toContain('text-blue-500');
    });
  });

  // ===== FormDescription Tests (10 tests) =====
  describe('FormDescription', () => {
    it('should render description text', () => {
      render(<FormDescription>Enter your email address</FormDescription>);

      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should apply default muted styling', () => {
      render(<FormDescription>Description</FormDescription>);

      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should apply custom className', () => {
      render(<FormDescription className="custom-desc">Description</FormDescription>);

      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('custom-desc');
    });

    it('should render as paragraph element', () => {
      render(<FormDescription>Description</FormDescription>);

      const desc = screen.getByText('Description');
      expect(desc.tagName).toBe('P');
    });

    it('should render with children elements', () => {
      render(
        <FormDescription>
          <strong>Important:</strong> Read carefully
        </FormDescription>
      );

      expect(screen.getByText('Important:')).toBeInTheDocument();
      expect(screen.getByText('Read carefully')).toBeInTheDocument();
    });

    it('should handle long description text', () => {
      const longText = 'This is a very long description text that should wrap properly and maintain readability across multiple lines';
      render(<FormDescription>{longText}</FormDescription>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should support data-testid', () => {
      render(<FormDescription data-testid="description">Test</FormDescription>);

      expect(screen.getByTestId('description')).toBeInTheDocument();
    });

    it('should render multiple descriptions', () => {
      render(
        <>
          <FormDescription>Description 1</FormDescription>
          <FormDescription>Description 2</FormDescription>
        </>
      );

      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText('Description 2')).toBeInTheDocument();
    });

    it('should support HTML content', () => {
      render(
        <FormDescription>
          <em>Italic</em> and <code>code</code>
        </FormDescription>
      );

      expect(screen.getByText('Italic')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const { container } = render(<FormDescription>{''}</FormDescription>);

      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });

  // ===== FormMessage Tests (15 tests) =====
  describe('FormMessage', () => {
    it('should render error message', () => {
      render(<FormMessage type="error">This field is required</FormMessage>);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should render success message', () => {
      render(<FormMessage type="success">Saved successfully</FormMessage>);

      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });

    it('should render warning message', () => {
      render(<FormMessage type="warning">Please review</FormMessage>);

      expect(screen.getByText('Please review')).toBeInTheDocument();
    });

    it('should render info message', () => {
      render(<FormMessage type="info">Additional information</FormMessage>);

      expect(screen.getByText('Additional information')).toBeInTheDocument();
    });

    it('should not render when children is empty', () => {
      const { container } = render(<FormMessage type="error">{''}</FormMessage>);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when children is null', () => {
      const { container } = render(<FormMessage type="error">{null}</FormMessage>);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when children is undefined', () => {
      const { container } = render(<FormMessage type="error">{undefined}</FormMessage>);

      expect(container.firstChild).toBeNull();
    });

    it('should render error icon', () => {
      const { container } = render(<FormMessage type="error">Error</FormMessage>);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render success icon', () => {
      const { container } = render(<FormMessage type="success">Success</FormMessage>);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should apply error styling', () => {
      const { container } = render(<FormMessage type="error">Error</FormMessage>);

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('text-destructive');
    });

    it('should apply success styling', () => {
      const { container } = render(<FormMessage type="success">Success</FormMessage>);

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('text-green-600');
    });

    it('should apply warning styling', () => {
      const { container } = render(<FormMessage type="warning">Warning</FormMessage>);

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('text-yellow-600');
    });

    it('should apply info styling', () => {
      const { container } = render(<FormMessage type="info">Info</FormMessage>);

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('text-blue-600');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <FormMessage type="error" className="custom-message">Error</FormMessage>
      );

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('custom-message');
    });

    it('should default to error type', () => {
      const { container } = render(<FormMessage>Default Error</FormMessage>);

      const message = container.firstChild as HTMLElement;
      expect(message.className).toContain('text-destructive');
    });
  });

  // ===== FormInput Tests (20 tests) =====
  describe('FormInput', () => {
    it('should render input element', () => {
      render(<FormInput />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should apply default type as text', () => {
      render(<FormInput />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should support different input types', () => {
      const { rerender } = render(<FormInput type="email" />);
      let input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');

      rerender(<FormInput type="password" />);
      input = document.querySelector('input[type="password"]')!;
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should apply error styling when error prop is true', () => {
      render(<FormInput error />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-destructive');
    });

    it('should apply success styling when success prop is true', () => {
      render(<FormInput success />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-green-500');
    });

    it('should handle value changes', async () => {
      const user = userEvent.setup();
      render(<FormInput />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test value');

      expect(input).toHaveValue('test value');
    });

    it('should support placeholder', () => {
      render(<FormInput placeholder="Enter text" />);

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should support disabled state', () => {
      render(<FormInput disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should apply disabled styling', () => {
      render(<FormInput disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should support readonly attribute', () => {
      render(<FormInput readOnly />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('should support custom className', () => {
      render(<FormInput className="custom-input" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<FormInput ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should support onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FormInput onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      expect(onChange).toHaveBeenCalled();
    });

    it('should support onBlur handler', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(<FormInput onBlur={onBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(onBlur).toHaveBeenCalled();
    });

    it('should support onFocus handler', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      render(<FormInput onFocus={onFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(onFocus).toHaveBeenCalled();
    });

    it('should apply focus ring styles', () => {
      render(<FormInput />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    });

    it('should support maxLength attribute', () => {
      render(<FormInput maxLength={10} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should support minLength attribute', () => {
      render(<FormInput minLength={5} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('minLength', '5');
    });

    it('should support pattern attribute', () => {
      render(<FormInput pattern="[0-9]*" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });

    it('should support required attribute', () => {
      render(<FormInput required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });
  });

  // ===== FormTextarea Tests (15 tests) =====
  describe('FormTextarea', () => {
    it('should render textarea element', () => {
      render(<FormTextarea />);

      const textarea = screen.getByRole('textbox');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should apply minimum height', () => {
      render(<FormTextarea />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('min-h-[80px]');
    });

    it('should apply error styling', () => {
      render(<FormTextarea error />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-destructive');
    });

    it('should apply success styling', () => {
      render(<FormTextarea success />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-green-500');
    });

    it('should handle value changes', async () => {
      const user = userEvent.setup();
      render(<FormTextarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'multiline\ntext');

      expect(textarea).toHaveValue('multiline\ntext');
    });

    it('should support placeholder', () => {
      render(<FormTextarea placeholder="Enter description" />);

      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('should support disabled state', () => {
      render(<FormTextarea disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should support readonly attribute', () => {
      render(<FormTextarea readOnly />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should support custom className', () => {
      render(<FormTextarea className="custom-textarea" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('custom-textarea');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<FormTextarea ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('should support rows attribute', () => {
      render(<FormTextarea rows={5} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('should support cols attribute', () => {
      render(<FormTextarea cols={50} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('cols', '50');
    });

    it('should support maxLength attribute', () => {
      render(<FormTextarea maxLength={100} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxLength', '100');
    });

    it('should apply focus ring styles', () => {
      render(<FormTextarea />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('focus-visible:ring-2');
    });

    it('should handle newlines correctly', async () => {
      const user = userEvent.setup();
      render(<FormTextarea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1{Enter}Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
    });
  });
});
