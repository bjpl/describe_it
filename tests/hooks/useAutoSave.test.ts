import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAutoSave } from "../../src/hooks/useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should not save on initial render", async () => {
    const onSave = vi.fn();
    const data = { value: "test" };

    renderHook(() =>
      useAutoSave({
        data,
        onSave,
        delay: 1000,
      })
    );

    await vi.advanceTimersByTimeAsync(2000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should save after delay when data changes", async () => {
    const onSave = vi.fn();
    let data = { value: "initial" };

    const { rerender } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        delay: 1000,
      })
    );

    data = { value: "updated" };
    rerender();

    await vi.advanceTimersByTimeAsync(1500);
    expect(onSave).toHaveBeenCalledWith({ value: "updated" });
  });

  it("should debounce multiple rapid changes", async () => {
    const onSave = vi.fn();
    let data = { value: "initial" };

    const { rerender } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        delay: 1000,
      })
    );

    // Rapid changes
    data = { value: "change1" };
    rerender();
    await vi.advanceTimersByTimeAsync(500);

    data = { value: "change2" };
    rerender();
    await vi.advanceTimersByTimeAsync(500);

    data = { value: "change3" };
    rerender();
    await vi.advanceTimersByTimeAsync(1500);

    // Should only save once with final value
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ value: "change3" });
  });

  it("should respect enabled flag", async () => {
    const onSave = vi.fn();
    let data = { value: "initial" };

    const { rerender } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        delay: 1000,
        enabled: false,
      })
    );

    data = { value: "updated" };
    rerender();

    await vi.advanceTimersByTimeAsync(2000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should call onSuccess callback", async () => {
    const onSave = vi.fn();
    const onSuccess = vi.fn();
    let data = { value: "initial" };

    const { rerender } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        onSuccess,
        delay: 1000,
      })
    );

    data = { value: "updated" };
    rerender();

    await vi.advanceTimersByTimeAsync(1500);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("should call onError callback on save failure", async () => {
    const error = new Error("Save failed");
    const onSave = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    let data = { value: "initial" };

    const { rerender } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        onError,
        delay: 1000,
      })
    );

    data = { value: "updated" };
    rerender();

    await vi.advanceTimersByTimeAsync(1500);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it("should support force save", async () => {
    const onSave = vi.fn();
    const data = { value: "test" };

    const { result } = renderHook(() =>
      useAutoSave({
        data,
        onSave,
        delay: 1000,
      })
    );

    await result.current.forceSave();

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(data);
    });
  });
});
