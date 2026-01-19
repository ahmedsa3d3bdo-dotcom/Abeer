import { EventEmitter } from "events";

export type NotificationEvent =
  | { kind: "created"; userId: string; payload: any }
  | { kind: "read"; userId: string; payload: { id: string } }
  | { kind: "readMany"; userId: string; payload: { ids: string[] } }
  | { kind: "markAll"; userId: string; payload: { count: number } }
  | { kind: "archived"; userId: string; payload: { id: string } };

class NotificationsEmitter {
  private emitter = new EventEmitter();
  constructor() {
    this.emitter.setMaxListeners(1000);
  }
  subscribe(userId: string, cb: (e: NotificationEvent) => void) {
    const channel = this.channel(userId);
    this.emitter.on(channel, cb);
    return () => this.emitter.off(channel, cb);
  }
  emit(event: NotificationEvent) {
    this.emitter.emit(this.channel(event.userId), event);
  }
  private channel(userId: string) {
    return `notifications:${userId}`;
  }
}

export const notificationsEmitter = new NotificationsEmitter();
