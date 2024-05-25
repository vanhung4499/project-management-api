import {belongsTo, Entity, hasOne, model, property} from '@loopback/repository';
import {Project} from './project.model';

@model({settings: {strict: false}})
export class Task extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    required: true,
  })
  description: string;

  @property({
    type: 'string',
    required: true,
    default: 'normal',
  })
  type: string;

  @property({
    type: 'string',
  })
  status?: string;

  @property({
    type: 'string',
  })
  assignee?: string;

  @property({
    type: 'string',
  })
  parentTaskId?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: string;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  updatedAt?: string;

  @belongsTo(() => Project)
  projectId: string;

  @hasOne(() => Task, {keyTo: 'parentTaskId'})
  parentTask: Task;

  constructor(data?: Partial<Task>) {
    super(data);
  }
}

export interface TaskRelations {
  // describe navigational properties here
}

export type TaskWithRelations = Task & TaskRelations;
