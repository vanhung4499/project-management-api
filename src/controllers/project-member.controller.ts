import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {Filter, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {Project, ProjectMember, User} from '../models';
import {ProjectMemberRepository, ProjectRepository} from '../repositories';

export class ProjectMemberController {
  constructor(
    @repository(ProjectMemberRepository)
    public projectMemberRepository: ProjectMemberRepository,
    @repository(ProjectRepository)
    public projectRepository: ProjectRepository,
  ) {}

  @get('/projects/{id}/members')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['view']})
  @response(200, {
    description: 'Array of ProjectMember model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {includeRelations: true}),
        },
      },
    },
  })
  async findMembers(
    @param.path.string('id') id: string,
    @param.filter(ProjectMember) filter?: Filter<ProjectMember>,
  ): Promise<ProjectMember[]> {
    const projectMembers = await this.projectMemberRepository.find({
      ...filter,
      where: {projectId: id},
      include: [{relation: 'user'}],
    });
    return projectMembers;
  }

  @post('/projects/{id}/members')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['modify']})
  @response(200, {
    description: 'ProjectMember model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async addMember(
    @param.path.string('id') id: typeof Project.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ProjectMember, {
            title: 'NewProjectMember',
            exclude: ['id', 'projectId'],
          }),
        },
      },
    })
    member: Omit<ProjectMember, 'id' | 'projectId'>,
  ): Promise<ProjectMember> {
    const isMember = await this.projectMemberRepository.checkMember(
      member.userId,
      id,
    );

    if (isMember) {
      throw new HttpErrors.Conflict('User is already a member of this project');
    }

    return this.projectMemberRepository.create({...member, projectId: id});
  }

  @patch('/projects/{id}/members/{userId}')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['modify']})
  @response(204, {
    description: 'ProjectMember PATCH success',
  })
  async updateMember(
    @param.path.string('id') id: string,
    @param.path.string('userId') userId: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ProjectMember, {partial: true}),
        },
      },
    })
    projectMember: Omit<ProjectMember, 'id' | 'projectId' | 'userId'>,
  ): Promise<void> {
    const isMember = await this.projectMemberRepository.checkMember(userId, id);

    if (!isMember) {
      throw new HttpErrors.Conflict('User is not a member of this project');
    }

    projectMember = {...projectMember, projectId: id, userId};

    await this.projectMemberRepository.updateAll(
      {projectId: id, userId},
      projectMember,
    );
  }

  @del('/projects/{id}/members/{userId}')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['modify']})
  @response(204, {
    description: 'ProjectMember DELETE success',
  })
  async removeMember(
    @param.path.string('id') id: string,
    @param.path.string('userId') userId: string,
  ): Promise<void> {
    const isMember = await this.projectMemberRepository.checkMember(userId, id);

    if (!isMember) {
      throw new HttpErrors.Conflict('User is not a member of this project');
    }

    const isOwner = await this.projectMemberRepository.checkAdmin(userId, id);

    if (isOwner) {
      throw new HttpErrors.Conflict('Owner cannot be removed from project');
    }

    await this.projectMemberRepository.deleteAll({
      projectId: id,
      userId,
    });
  }
}
