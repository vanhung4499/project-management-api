import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Project} from './project.model';
import {User} from './user.model';

@model({settings: {strict: false}})
export class ProjectMember extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @belongsTo(() => User)
  userId: string;

  @belongsTo(() => Project)
  projectId: string;

  @property({
    type: 'string',
    required: true,
  })
  role: string;

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
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<ProjectMember>) {
    super(data);
  }
}

export interface ProjectMemberRelations {
  // describe navigational properties here
}

export type ProjectMemberWithRelations = ProjectMember & ProjectMemberRelations;
