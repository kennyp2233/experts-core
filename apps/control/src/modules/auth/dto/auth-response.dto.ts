import { Exclude, Expose } from 'class-transformer';

export class AdminDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  role: string;

  @Expose()
  isActive: boolean;

  @Expose()
  lastLogin?: Date;

  @Expose()
  createdAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  updatedAt: Date;
}

export class AuthResponseDto {
  success: boolean;
  data: {
    token: string;
    admin: AdminDto;
  };
  message?: string;
}
