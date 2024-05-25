import {Getter, inject} from '@loopback/core';
import {
  BelongsToAccessor,
  DefaultCrudRepository,
  repository,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Project, ProjectMember, ProjectMemberRelations, User} from '../models';
import {ProjectRepository} from './project.repository';
import {UserRepository} from './user.repository';

export class ProjectMemberRepository extends DefaultCrudRepository<
  ProjectMember,
  typeof ProjectMember.prototype.id,
  ProjectMemberRelations
> {
  public readonly user: BelongsToAccessor<
    User,
    typeof ProjectMember.prototype.id
  >;

  public readonly project: BelongsToAccessor<
    Project,
    typeof ProjectMember.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
    @repository.getter('UserRepository')
    protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('ProjectRepository')
    protected projectRepositoryGetter: Getter<ProjectRepository>,
  ) {
    super(ProjectMember, dataSource);
    this.project = this.createBelongsToAccessorFor(
      'project',
      projectRepositoryGetter,
    );
    this.registerInclusionResolver('project', this.project.inclusionResolver);
    this.user = this.createBelongsToAccessorFor('user', userRepositoryGetter);
    this.registerInclusionResolver('user', this.user.inclusionResolver);

    (this.modelClass as any).observe('persist', async (ctx: any) => {
      ctx.data.updatedAt = new Date();
    });
  }

  async checkMember(userId: string, projectId: string): Promise<boolean> {
    const projectMember = await this.findOne({
      where: {
        userId,
        projectId,
      },
    });
    return Boolean(projectMember);
  }

  async checkAdmin(userId: string, projectId: string): Promise<boolean> {
    const projectMember = await this.findOne({
      where: {
        projectId,
        userId,
        role: 'admin',
      },
    });
    return Boolean(projectMember);
  }
}
