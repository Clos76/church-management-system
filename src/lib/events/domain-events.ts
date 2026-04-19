export type DomainEvent =
  | { type: "member.created"; profileId: string; status: string }
  | { type: "member.statusChanged"; profileId: string; from: string; to: string }
  | { type: "tag.assigned"; profileId: string; tagId: string }
  | { type: "group.joined"; profileId: string; groupId: string }
  | { type: "group.left"; profileId: string; groupId: string }
  | { type: "event.registered"; profileId: string; eventId: string }
  | { type: "event.attended"; profileId: string; eventId: string; firstTime: boolean }
  | { type: "donation.completed"; profileId: string; amount: number; fundId: string }
  | { type: "form.submitted"; profileId: string; formId: string }
  | { type: "task.created"; profileId: string; taskId: string; actorId: string }
  | { type: "task.completed"; profileId: string; taskId: string; actorId: string }
  | { type: "email.sent"; profileId: string; subject: string };
