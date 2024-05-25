import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {Filter, FilterExcludingWhere, repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {Project} from '../models';
import {ProjectMemberRepository, ProjectRepository} from '../repositories';
import {basicAuthorization} from '../services';

export class ProjectController {
  constructor(
    @repository(ProjectRepository)
    public projectRepository: ProjectRepository,
    @repository(ProjectMemberRepository)
    public projectMemberRepository: ProjectMemberRepository,
  ) {}

  @post('/projects')
  @authenticate('jwt')
  @response(200, {
    description: 'Project model instance',
    content: {'application/json': {schema: getModelSchemaRef(Project)}},
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Project, {
            title: 'NewProject',
            exclude: ['id'],
          }),
        },
      },
    })
    project: Omit<Project, 'id'>,
  ): Promise<Project> {
    // Create a new project
    const newProject = await this.projectRepository.create(project);

    // Add the current user as an admin of the project
    const userId = currentUser.id;
    await this.projectMemberRepository.create({
      userId,
      projectId: newProject.id,
      role: 'admin',
    });

    return newProject;
  }

  @get('/projects')
  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    voters: [basicAuthorization],
  })
  @response(200, {
    description: 'Array of Project model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Project, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Project) filter?: Filter<Project>,
  ): Promise<Project[]> {
    return this.projectRepository.find(filter);
  }

  @get('projects/me')
  @authenticate('jwt')
  @response(200, {
    description: 'Array of Project model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Project, {includeRelations: true}),
        },
      },
    },
  })
  async findMyProjects(
    @inject(SecurityBindings.USER)
    currentUser: UserProfile,
    @param.filter(Project) filter?: Filter<Project>,
  ): Promise<Project[]> {
    const userId = currentUser.id;

    const projectMembers = await this.projectMemberRepository.find({
      where: {userId},
      include: ['project'],
    });

    return projectMembers.map(pm => pm.project);
  }

  @get('/projects/{id}')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['view']})
  @response(200, {
    description: 'Project model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Project, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Project, {exclude: 'where'})
    filter?: FilterExcludingWhere<Project>,
  ): Promise<Project> {
    return this.projectRepository.findById(id, filter);
  }

  @patch('/projects/{id}')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['modify']})
  @response(204, {
    description: 'Project PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Project, {partial: true, exclude: ['id']}),
        },
      },
    })
    project: Project,
  ): Promise<void> {
    await this.projectRepository.updateById(id, project);
  }

  @del('/projects/{id}')
  @authenticate('jwt')
  @authorize({resource: 'project', scopes: ['modify']})
  @response(204, {
    description: 'Project DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.projectRepository.deleteById(id);
  }
}
