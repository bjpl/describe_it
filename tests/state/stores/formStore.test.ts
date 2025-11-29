import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormStore, type FieldConfig, validationRules } from '@/lib/store/formStore';

describe('FormStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const store = useFormStore.getState();
    Object.keys(store.forms).forEach(formId => {
      store.destroyForm(formId);
    });
    useFormStore.setState({
      forms: {},
      activeFormId: null,
      globalErrors: [],
    });
  });

  describe('Form Creation', () => {
    it('should create a new form', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        username: {
          name: 'username',
          defaultValue: '',
          required: true,
        },
        email: {
          name: 'email',
          defaultValue: '',
          required: true,
        },
      };

      act(() => {
        result.current.createForm('testForm', config);
      });

      expect(result.current.forms.testForm).toBeDefined();
      expect(result.current.forms.testForm.id).toBe('testForm');
      expect(Object.keys(result.current.forms.testForm.fields)).toEqual(['username', 'email']);
    });

    it('should initialize fields with default values', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        name: {
          name: 'name',
          defaultValue: 'John Doe',
        },
        age: {
          name: 'age',
          defaultValue: 25,
        },
      };

      act(() => {
        result.current.createForm('userForm', config);
      });

      expect(result.current.forms.userForm.fields.name.value).toBe('John Doe');
      expect(result.current.forms.userForm.fields.age.value).toBe(25);
    });

    it('should set active form on creation', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: '' },
      };

      act(() => {
        result.current.createForm('firstForm', config);
      });

      expect(result.current.activeFormId).toBe('firstForm');
    });
  });

  describe('Form Destruction', () => {
    it('should destroy a form', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: '' },
      };

      act(() => {
        result.current.createForm('tempForm', config);
        result.current.destroyForm('tempForm');
      });

      expect(result.current.forms.tempForm).toBeUndefined();
    });

    it('should clear active form if destroyed', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: '' },
      };

      act(() => {
        result.current.createForm('activeForm', config);
        result.current.destroyForm('activeForm');
      });

      expect(result.current.activeFormId).toBeNull();
    });
  });

  describe('Field Value Updates', () => {
    const config: Record<string, FieldConfig> = {
      username: { name: 'username', defaultValue: '' },
      email: { name: 'email', defaultValue: '' },
    };

    it('should update field value', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm('testForm', config);
        result.current.setFieldValue('testForm', 'username', 'johndoe');
      });

      expect(result.current.forms.testForm.fields.username.value).toBe('johndoe');
    });

    it('should mark field as dirty when value changes', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm('testForm', config);
        result.current.setFieldValue('testForm', 'username', 'johndoe');
      });

      expect(result.current.forms.testForm.fields.username.isDirty).toBe(true);
    });

    it('should mark field as touched when value changes', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm('testForm', config);
        result.current.setFieldValue('testForm', 'username', 'johndoe');
      });

      expect(result.current.forms.testForm.fields.username.isTouched).toBe(true);
    });

    it('should mark form as dirty when any field is dirty', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm('testForm', config);
        result.current.setFieldValue('testForm', 'username', 'johndoe');
      });

      expect(result.current.forms.testForm.isDirty).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate required field', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        username: {
          name: 'username',
          defaultValue: '',
          required: true,
        },
      };

      act(() => {
        result.current.createForm('validationForm', config);
      });

      const isValid = await act(async () => {
        return await result.current.validateField('validationForm', 'username');
      });

      expect(isValid).toBe(false);
      expect(result.current.forms.validationForm.fields.username.error).toBeTruthy();
    });

    it('should pass validation for valid field', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        username: {
          name: 'username',
          defaultValue: '',
          required: true,
        },
      };

      act(() => {
        result.current.createForm('validationForm', config);
        result.current.setFieldValue('validationForm', 'username', 'johndoe');
      });

      const isValid = await act(async () => {
        return await result.current.validateField('validationForm', 'username');
      });

      expect(isValid).toBe(true);
      expect(result.current.forms.validationForm.fields.username.error).toBeNull();
    });

    it('should validate using custom validation rules', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig<string>> = {
        email: {
          name: 'email',
          defaultValue: '',
          validationRules: [validationRules.email()],
        },
      };

      act(() => {
        result.current.createForm('emailForm', config);
        result.current.setFieldValue('emailForm', 'email', 'invalid-email');
      });

      await act(async () => {
        await result.current.validateField('emailForm', 'email');
      });

      expect(result.current.forms.emailForm.fields.email.error).toBeTruthy();
    });

    it('should validate entire form', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        username: {
          name: 'username',
          defaultValue: '',
          required: true,
        },
        email: {
          name: 'email',
          defaultValue: '',
          required: true,
        },
      };

      act(() => {
        result.current.createForm('fullForm', config);
      });

      const isValid = await act(async () => {
        return await result.current.validateForm('fullForm');
      });

      expect(isValid).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully', async () => {
      const { result } = renderHook(() => useFormStore());
      const submitMock = vi.fn().mockResolvedValue({ success: true });

      const config: Record<string, FieldConfig> = {
        username: {
          name: 'username',
          defaultValue: 'johndoe',
        },
      };

      // Create form first
      act(() => {
        result.current.createForm('submitForm', config);
      });

      // Verify form was created
      expect(result.current.forms.submitForm).toBeDefined();

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitForm('submitForm', submitMock);
      });

      expect(submitMock).toHaveBeenCalledWith({ username: 'johndoe' });
      expect(submitResult).toEqual({ success: true });
    });

    it('should set submitting state during submission', async () => {
      const { result } = renderHook(() => useFormStore());

      let resolveSubmit: (value: any) => void;
      const submitPromise = new Promise(resolve => {
        resolveSubmit = resolve;
      });

      const submitMock = vi.fn().mockImplementation(() => submitPromise);

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: 'value' },
      };

      // Create form first
      act(() => {
        result.current.createForm('asyncForm', config);
      });

      // Verify form was created
      expect(result.current.forms.asyncForm).toBeDefined();

      // Start submission (don't await yet)
      const submission = act(async () => {
        return result.current.submitForm('asyncForm', submitMock);
      });

      // Check submitting state is true during submission
      await waitFor(() => {
        expect(result.current.forms.asyncForm?.isSubmitting).toBe(true);
      }, { timeout: 100 });

      // Now resolve the submission
      act(() => {
        resolveSubmit!({ success: true });
      });

      await submission;

      expect(result.current.forms.asyncForm.isSubmitting).toBe(false);
    });

    it('should fail submission if validation fails', async () => {
      const { result } = renderHook(() => useFormStore());
      const submitMock = vi.fn();

      const config: Record<string, FieldConfig> = {
        required: {
          name: 'required',
          defaultValue: '',
          required: true,
        },
      };

      // Create form first
      act(() => {
        result.current.createForm('validatedForm', config);
      });

      // Verify form was created
      expect(result.current.forms.validatedForm).toBeDefined();

      await expect(
        act(async () => {
          return result.current.submitForm('validatedForm', submitMock);
        })
      ).rejects.toThrow();

      expect(submitMock).not.toHaveBeenCalled();
    });

    it('should increment submit count on successful submission', async () => {
      const { result } = renderHook(() => useFormStore());
      const submitMock = vi.fn().mockResolvedValue({ success: true });

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: 'value' },
      };

      // Create form first
      act(() => {
        result.current.createForm('countForm', config);
      });

      // Verify form was created
      expect(result.current.forms.countForm).toBeDefined();

      await act(async () => {
        await result.current.submitForm('countForm', submitMock);
      });

      expect(result.current.forms.countForm.submitCount).toBe(1);
    });
  });

  describe('Form Reset', () => {
    it('should reset form to default values', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        username: { name: 'username', defaultValue: 'default' },
      };

      act(() => {
        result.current.createForm('resetForm', config);
        result.current.setFieldValue('resetForm', 'username', 'changed');
        result.current.resetForm('resetForm');
      });

      expect(result.current.forms.resetForm.fields.username.value).toBe('default');
      expect(result.current.forms.resetForm.isDirty).toBe(false);
    });
  });

  describe('History/Undo', () => {
    it('should save snapshot', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: '' },
      };

      act(() => {
        result.current.createForm('historyForm', config);
        result.current.saveSnapshot('historyForm', 'manual');
      });

      expect(result.current.forms.historyForm.history.length).toBeGreaterThan(0);
    });

    it('should check if can undo', () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig> = {
        test: { name: 'test', defaultValue: 'initial' },
      };

      act(() => {
        result.current.createForm('undoForm', config);
      });

      const canUndoInitial = result.current.canUndo('undoForm');

      act(() => {
        result.current.setFieldValue('undoForm', 'test', 'changed');
        result.current.saveSnapshot('undoForm', 'manual');
      });

      const canUndoAfter = result.current.canUndo('undoForm');

      expect(canUndoInitial).toBe(false);
      expect(canUndoAfter).toBe(true);
    });
  });

  describe('Validation Rules', () => {
    it('should validate minimum length', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig<string>> = {
        password: {
          name: 'password',
          defaultValue: '',
          validationRules: [validationRules.minLength(8)],
        },
      };

      act(() => {
        result.current.createForm('passwordForm', config);
        result.current.setFieldValue('passwordForm', 'password', '1234');
      });

      await act(async () => {
        await result.current.validateField('passwordForm', 'password');
      });

      expect(result.current.forms.passwordForm.fields.password.error).toBeTruthy();

      act(() => {
        result.current.setFieldValue('passwordForm', 'password', '12345678');
      });

      await act(async () => {
        await result.current.validateField('passwordForm', 'password');
      });

      expect(result.current.forms.passwordForm.fields.password.error).toBeNull();
    });

    it('should validate maximum length', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig<string>> = {
        bio: {
          name: 'bio',
          defaultValue: '',
          validationRules: [validationRules.maxLength(100)],
        },
      };

      act(() => {
        result.current.createForm('bioForm', config);
        result.current.setFieldValue('bioForm', 'bio', 'a'.repeat(150));
      });

      await act(async () => {
        await result.current.validateField('bioForm', 'bio');
      });

      expect(result.current.forms.bioForm.fields.bio.error).toBeTruthy();
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useFormStore());

      const config: Record<string, FieldConfig<string>> = {
        email: {
          name: 'email',
          defaultValue: '',
          validationRules: [validationRules.email()],
        },
      };

      act(() => {
        result.current.createForm('emailValidationForm', config);
        result.current.setFieldValue('emailValidationForm', 'email', 'test@example.com');
      });

      await act(async () => {
        await result.current.validateField('emailValidationForm', 'email');
      });

      expect(result.current.forms.emailValidationForm.fields.email.error).toBeNull();
    });
  });
});
