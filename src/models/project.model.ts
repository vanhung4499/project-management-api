import {Entity, hasMany, model, property} from '@loopback/repository';
import {ProjectMember} from './project-member.model';
import {Task} from './task.model';
import {User} from './user.model';

@model({settings: {strict: false}})
export class Project extends Entity {
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
  })
  description?: string;

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

  @hasMany(() => Task)
  tasks: Task[];

  @hasMany(() => ProjectMember)
  projectMembers: ProjectMember[];

  @hasMany(() => User, {through: {model: () => ProjectMember}})
  users: User[];
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Project>) {
    super(data);
  }
}

export interface ProjectRelations {
  // describe navigational properties here
}

export type ProjectWithRelations = Project & ProjectRelations;
