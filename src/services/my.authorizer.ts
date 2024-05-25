import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
  Authorizer,
} from '@loopback/authorization';
import {Provider} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ProjectMemberRepository} from '../repositories';

export class MyAuthorizerProvider implements Provider<Authorizer> {
  constructor(
    @repository(ProjectMemberRepository)
    public projectMemberRepository: ProjectMemberRepository,
  ) {}

  value(): Authorizer {
    return this.authorization.bind(this);
  }

  async authorization(
    context: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ) {
    if (metadata.resource === 'project') {
      // Get the current user ID
      const userId = context.principals[0].id;
      // Extract projectId from the context
      // eg. @post('/projects/{id}/***', ...) returns `id` as args[0]
      const projectId = context.invocationContext.args[0];

      const scopes = metadata.scopes;

      // Check if the user is allowed to access the project
      let allowed = false;
      if (scopes?.includes('modify')) {
        // only allow admins to modify projects
        allowed = await this.projectMemberRepository.checkAdmin(
          userId,
          projectId,
        );
      } else if (scopes?.includes('view') || scopes?.includes('task')) {
        // allow project members to view the project
        allowed = await this.projectMemberRepository.checkMember(
          userId,
          projectId,
        );
      }
      return allowed ? AuthorizationDecision.ALLOW : AuthorizationDecision.DENY;
    }

    return AuthorizationDecision.ALLOW;
  }
}
