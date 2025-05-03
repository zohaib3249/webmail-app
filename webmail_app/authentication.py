from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import EmailAlias

class EmailAliasJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        alias_id = validated_token.get('user_id')

        if not alias_id:
            raise AuthenticationFailed('Invalid token: alias ID missing')

        alias = EmailAlias.objects.filter(id=alias_id, is_active=True).first()
        if alias is None:
            raise AuthenticationFailed('Alias not found or inactive')
        setattr(alias, 'is_authenticated', True)

        return alias
