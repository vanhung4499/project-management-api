import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasManyThroughRepositoryFactory,
  repository,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Project, ProjectMember, ProjectRelations, Task, User} from '../models';
import {ProjectMemberRepository} from './project-member.repository';
import {TaskRepository} from './task.repository';
import {UserRepository} from './user.repository';

export class ProjectRepository extends DefaultCrudRepository<
  Project,
  typeof Project.prototype.id,
  ProjectRelations
> {
  public readonly tasks: HasManyRepositoryFactory<
    Task,
    typeof Project.prototype.id
  >;

  public readonly projectMembers: HasManyRepositoryFactory<
    ProjectMember,
    typeof Project.prototype.id
  >;

  public readonly users: HasManyThroughRepositoryFactory<
    User,
    typeof User.prototype.id,
    ProjectMember,
    typeof Project.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('TaskRepository')
    protected taskRepositoryGetter: Getter<TaskRepository>,
    @repository.getter('ProjectMemberRepository')
    protected projectMemberRepositoryGetter: Getter<ProjectMemberRepository>,
  ) {
    super(Project, dataSource);
    this.users = this.createHasManyThroughRepositoryFactoryFor(
      'users',
      userRepositoryGetter,
      projectMemberRepositoryGetter,
    );
    this.registerInclusionResolver('users', this.users.inclusionResolver);
    this.projectMembers = this.createHasManyRepositoryFactoryFor(
      'projectMembers',
      projectMemberRepositoryGetter,
    );
    this.registerInclusionResolver(
      'projectMembers',
      this.projectMembers.inclusionResolver,
    );
    this.tasks = this.createHasManyRepositoryFactoryFor(
      'tasks',
      taskRepositoryGetter,
    );
    this.registerInclusionResolver('tasks', this.tasks.inclusionResolver);

    (this.modelClass as any).observe('persist', async (ctx: any) => {
      ctx.data.updatedAt = new Date();
    });
  }
}
