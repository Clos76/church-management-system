import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client");
vi.mock("@/lib/events/event-bus", () => ({ eventBus: { emit: vi.fn() } }));

import { createClient } from "@/lib/supabase/client";
import { eventBus } from "@/lib/events/event-bus";
import { TaskService } from "@/lib/services/task-service";
import { makeChain, makeMockClient } from "../helpers/mock-supabase";

const mockCreateClient = vi.mocked(createClient);

function makeService(chains: ReturnType<typeof makeChain>[], user?: any) {
  mockCreateClient.mockReturnValue(makeMockClient(chains, user) as any);
  return new TaskService();
}

const task = {
  id: "task-1",
  profile_id: "member-1",
  title: "Follow up",
  status: "pending",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("TaskService.createTask", () => {
  it("creates a task and emits task.created", async () => {
    const service = makeService([makeChain({ data: task, error: null })]);
    vi.mocked(eventBus.emit).mockClear();

    const result = await service.createTask({
      profile_id: "member-1",
      title: "Follow up",
    });

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "task.created",
        profileId: "member-1",
        taskId: "task-1",
        actorId: "actor-id-1",
      }),
    );
  });

  it("returns success: false when not authenticated", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);
    const service = new TaskService();

    const result = await service.createTask({ profile_id: "m-1", title: "Call" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Not authenticated/i);
  });

  it("returns success: false when insert fails", async () => {
    const service = makeService([
      makeChain({ data: null, error: { message: "insert error" } }),
    ]);

    const result = await service.createTask({ profile_id: "m-1", title: "Call" });

    expect(result.success).toBe(false);
  });
});

describe("TaskService.completeTask", () => {
  it("marks task completed and emits task.completed", async () => {
    const service = makeService([
      makeChain({ data: { profile_id: "member-1" }, error: null }), // select profile_id
      makeChain({ data: null, error: null }),                         // update status
    ]);
    vi.mocked(eventBus.emit).mockClear();

    const result = await service.completeTask("task-1");

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "task.completed",
        profileId: "member-1",
        taskId: "task-1",
      }),
    );
  });

  it("returns success: false when update errors", async () => {
    const service = makeService([
      makeChain({ data: { profile_id: "m-1" }, error: null }),
      makeChain({ data: null, error: { message: "update failed" } }),
    ]);

    const result = await service.completeTask("task-1");

    expect(result.success).toBe(false);
  });
});

describe("TaskService.deleteTask", () => {
  it("returns success: true on delete", async () => {
    const service = makeService([makeChain({ data: null, error: null })]);
    const result = await service.deleteTask("task-1");
    expect(result.success).toBe(true);
  });
});
