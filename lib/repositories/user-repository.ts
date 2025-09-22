import { db, users, type User, type NewUser } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export interface CreateUserInput {
  email: string
  passwordHash?: string | null
  googleId?: string | null
  name?: string | null
  avatarUrl?: string | null
}

export interface UpdateUserInput {
  email?: string
  passwordHash?: string | null
  googleId?: string | null
  name?: string | null
  avatarUrl?: string | null
}

export interface GoogleUserInput {
  email: string
  googleId: string
  name?: string | null
  avatarUrl?: string | null
}

export class UserRepository extends BaseRepository {
  async findById(userId: string): Promise<User | null> {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .then(res => res[0] || null)

      return user || null
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      this.validateRequiredFields({ email }, ['email'])

      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .then(res => res[0] || null)

      return user || null
    } catch (error) {
      this.handleError(error, 'findByEmail')
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      this.validateRequiredFields({ googleId }, ['googleId'])

      const user = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId))
        .then(res => res[0] || null)

      return user || null
    } catch (error) {
      this.handleError(error, 'findByGoogleId')
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email)
      return user !== null
    } catch (error) {
      this.handleError(error, 'emailExists')
    }
  }

  async create(input: CreateUserInput): Promise<CreateResult<User>> {
    try {
      this.validateRequiredFields(input, ['email'])

      if (!input.passwordHash && !input.googleId) {
        throw new Error('Either passwordHash or googleId must be provided')
      }

      // Check if email already exists
      const existingUser = await this.findByEmail(input.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash || null,
          googleId: input.googleId || null,
          name: input.name || null,
          avatarUrl: input.avatarUrl || null,
        })
        .returning()

      return {
        success: true,
        data: newUser,
        id: newUser.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async update(userId: string, input: UpdateUserInput): Promise<UpdateResult<User>> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      const updateData: Partial<NewUser> = {}

      if (input.email !== undefined) {
        // Check if new email already exists (for different user)
        const existingUser = await this.findByEmail(input.email)
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already exists')
        }
        updateData.email = input.email
      }

      if (input.passwordHash !== undefined) {
        updateData.passwordHash = input.passwordHash
      }

      if (input.googleId !== undefined) {
        updateData.googleId = input.googleId
      }

      if (input.name !== undefined) {
        updateData.name = input.name
      }

      if (input.avatarUrl !== undefined) {
        updateData.avatarUrl = input.avatarUrl
      }

      updateData.updatedAt = new Date()

      if (Object.keys(updateData).length === 0) {
        return { success: true, changes: 0 }
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()

      return {
        success: true,
        data: updatedUser,
        changes: updatedUser ? 1 : 0,
      }
    } catch (error) {
      this.handleError(error, 'update')
    }
  }

  async delete(userId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      await db.delete(users).where(eq(users.id, userId))

      return {
        success: true,
        deletedId: userId,
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async getUserStats(userId: string): Promise<{
    totalDecks: number
    totalCards: number
    totalReviews: number
  }> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      // This will be implemented when we refactor the analytics
      // For now, return basic stats
      return {
        totalDecks: 0,
        totalCards: 0,
        totalReviews: 0,
      }
    } catch (error) {
      this.handleError(error, 'getUserStats')
    }
  }

  async createOrUpdateGoogleUser(input: GoogleUserInput): Promise<User> {
    try {
      this.validateRequiredFields(input, ['email', 'googleId'])

      const existingByGoogle = await this.findByGoogleId(input.googleId)
      if (existingByGoogle) {
        const needsUpdate =
          existingByGoogle.email !== input.email ||
          existingByGoogle.name !== input.name ||
          existingByGoogle.avatarUrl !== input.avatarUrl

        if (needsUpdate) {
          const result = await this.update(existingByGoogle.id, {
            email: input.email,
            name: input.name,
            avatarUrl: input.avatarUrl,
          })

          return result.data ?? (await this.findById(existingByGoogle.id)) ?? existingByGoogle
        }

        return existingByGoogle
      }

      const existingByEmail = await this.findByEmail(input.email)
      if (existingByEmail) {
        const result = await this.update(existingByEmail.id, {
          googleId: input.googleId,
          name: input.name,
          avatarUrl: input.avatarUrl,
        })

        return result.data ?? (await this.findById(existingByEmail.id)) ?? existingByEmail
      }

      const created = await this.create({
        email: input.email,
        googleId: input.googleId,
        name: input.name,
        avatarUrl: input.avatarUrl,
      })

      return created.data
    } catch (error) {
      this.handleError(error, 'createOrUpdateGoogleUser')
    }
  }
}

export const userRepository = new UserRepository()
