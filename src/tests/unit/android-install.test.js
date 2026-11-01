import { describe, it, expect, vi } from 'vitest';
import { InstallController } from '../../pwa/install-controller.js';
const event = (outcome = 'dismissed') => ({ preventDefault: vi.fn(), prompt: vi.fn(async () => {}),
  userChoice: Promise.resolve({ outcome }) });
describe('install prompt ownership', () => {
  it('consumes prompts once and permits a new browser event after dismissal', async () => {
    const controller = new InstallController(vi.fn());
    const first = event(); controller.capture(first, false);
    expect(first.preventDefault).toHaveBeenCalledOnce();
    await Promise.all([controller.prompt(), controller.prompt()]);
    expect(first.prompt).toHaveBeenCalledOnce(); expect(controller.available).toBe(false);
    const second = event('accepted'); controller.capture(second, false);
    await controller.prompt(); expect(second.prompt).toHaveBeenCalledOnce();
  });
  it('does not offer installation in standalone mode or after appinstalled', () => {
    const controller = new InstallController(vi.fn());
    controller.capture(event(), true); expect(controller.available).toBe(false);
    controller.capture(event(), false); controller.markInstalled();
    controller.capture(event(), false); expect(controller.available).toBe(false);
  });
  it('handles a rejected prompt without retaining a consumed event or a busy state', async () => {
    const controller = new InstallController(vi.fn()), prompt = event();
    prompt.prompt.mockRejectedValue(new Error('denied'));
    controller.capture(prompt, false);
    await expect(controller.prompt()).rejects.toThrow('denied');
    expect(controller.busy).toBe(false); expect(controller.available).toBe(false);
  });
});
