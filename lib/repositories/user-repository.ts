import { db } from '@/lib/db'
import { users, type User, type NewUser } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export interface CreateUserInput {
  email: string
  passwordHash: string
}

export interface UpdateUserInput {
  email?: string
  passwordHash?: string
}

export class UserRepository extends BaseRepository {
  async findById(userId: string): Promise<User | null> {
    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get()
      
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
        .get()
      
      return user || null
    } catch (error) {
      this.handleError(error, 'findByEmail')
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
      this.validateRequiredFields(input, ['email', 'passwordHash'])
      
      // Check if email already exists
      const existingUser = await this.findByEmail(input.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
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
}

export const userRepository = new UserRepository()