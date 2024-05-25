import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasManyThroughRepositoryFactory,
  HasOneRepositoryFactory,
  repository,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {
  Project,
  ProjectMember,
  Task,
  User,
  UserCredentials,
  UserRelations,
} from '../models';
import {ProjectMemberRepository} from './project-member.repository';
import {ProjectRepository} from './project.repository';
import {UserCredentialsRepository} from './user-credentials.repository';

export type Credentials = {
  email: string;
  password: string;
};

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {
  public readonly tasks: HasManyRepositoryFactory<
    Task,
    typeof User.prototype.id
  >;

  public readonly projects: HasManyThroughRepositoryFactory<
    Project,
    typeof Project.prototype.id,
    ProjectMember,
    typeof User.prototype.id
  >;

  public readonly userCredentials: HasOneRepositoryFactory<
    UserCredentials,
    typeof User.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('ProjectMemberRepository')
    protected projectMemberRepositoryGetter: Getter<ProjectMemberRepository>,
    @repository.getter('ProjectRepository')
    protected projectRepositoryGetter: Getter<ProjectRepository>,
    @repository.getter('UserCredentialsRepository')
    protected userCredentialsRepositoryGetter: Getter<UserCredentialsRepository>,
  ) {
    super(User, dataSource);
    this.userCredentials = this.createHasOneRepositoryFactoryFor(
      'userCredentials',
      userCredentialsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'userCredentials',
      this.userCredentials.inclusionResolver,
    );
    this.projects = this.createHasManyThroughRepositoryFactoryFor(
      'projects',
      projectRepositoryGetter,
      projectMemberRepositoryGetter,
    );
    this.registerInclusionResolver('projects', this.projects.inclusionResolver);

    (this.modelClass as any).observe('persist', async (ctx: any) => {
      ctx.data.updatedAt = new Date();
    });
  }

  async findCredentials(
    userId: typeof User.prototype.id,
  ): Promise<UserCredentials | undefined> {
    try {
      return await this.userCredentials(userId).get();
    } catch (err) {
      if (err.code === 'ENTITY_NOT_FOUND') {
        return undefined;
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({where: {email}});
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({where: {username}});
  }
}
