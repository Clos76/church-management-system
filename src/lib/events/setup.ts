import { eventBus } from "./event-bus";
import { timelineService } from "@/lib/services/timeline-service";
import type { ActivityEventType } from "@/lib/services/timeline-service";

const EVENT_TYPE_MAP: Partial<Record<string, ActivityEventType>> = {
  "member.created": "member.created",
  "member.statusChanged": "member.updated",
  "tag.assigned": "tag.assigned",
  "group.joined": "group.joined",
  "group.left": "group.left",
  "event.registered": "event.registered",
  "event.attended": "event.attended",
  "donation.completed": "donation.completed",
  "form.submitted": "email.sent",
  "task.created": "task.created",
  "task.completed": "task.completed",
  "email.sent": "email.sent",
};

const EVENTS = [
  "member.created",
  "member.statusChanged",
  "tag.assigned",
  "group.joined",
  "group.left",
  "event.registered",
  "event.attended",
  "donation.completed",
  "form.submitted",
  "task.created",
  "task.completed",
  "email.sent",
] as const;

let initialized = false;

export function setupEventHandlers(): void {
  if (initialized) return;
  initialized = true;

  for (const eventType of EVENTS) {
    eventBus.on(eventType, (event) => {
      const timelineEventType =
        (EVENT_TYPE_MAP[event.type] as ActivityEventType) ?? event.type;

      const { type, profileId, ...rest } = event as {
        type: string;
        profileId: string;
        [key: string]: unknown;
      };

      timelineService.addEntry({
        profile_id: profileId,
        event_type: timelineEventType,
        metadata: rest,
      });
    });
  }
}

setupEventHandlers();
