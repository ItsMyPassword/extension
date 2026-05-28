import { describe, it, expect, vi, beforeEach } from "vitest";

import { installChromeMock } from "../helpers/chrome-mock.js";

const pullEvents = vi.hoisted(() => vi.fn());

vi.mock("../../src/background/sync/engine.js", () => ({ pullEvents }));

const ALARM_NAME = "keyfount.sync.pull";

describe("sync poll", () => {
  let chromeMock: ReturnType<typeof installChromeMock>;

  beforeEach(() => {
    pullEvents.mockReset();
    pullEvents.mockResolvedValue(null);
    chromeMock = installChromeMock();
  });

  it("schedules a single 5-minute periodic alarm", async () => {
    const create = vi.spyOn(chrome.alarms, "create");
    const { scheduleSyncPoll } = await import("../../src/background/sync/poll.js");
    await scheduleSyncPoll();
    expect(create).toHaveBeenCalledWith(ALARM_NAME, {
      delayInMinutes: 5,
      periodInMinutes: 5,
    });
  });

  it("runs pullEvents when the keyfount alarm fires", async () => {
    const { registerSyncPollHandler } = await import("../../src/background/sync/poll.js");
    registerSyncPollHandler();
    chromeMock.alarms.__fire(ALARM_NAME);
    expect(pullEvents).toHaveBeenCalledTimes(1);
  });

  it("ignores alarms owned by other features", async () => {
    const { registerSyncPollHandler } = await import("../../src/background/sync/poll.js");
    registerSyncPollHandler();
    chromeMock.alarms.__fire("some.other.alarm");
    expect(pullEvents).not.toHaveBeenCalled();
  });

  it("swallows a rejected pull without throwing", async () => {
    pullEvents.mockRejectedValueOnce(new Error("offline"));
    const { registerSyncPollHandler } = await import("../../src/background/sync/poll.js");
    registerSyncPollHandler();
    expect(() => chromeMock.alarms.__fire(ALARM_NAME)).not.toThrow();
    await Promise.resolve();
    expect(pullEvents).toHaveBeenCalledTimes(1);
  });
});
