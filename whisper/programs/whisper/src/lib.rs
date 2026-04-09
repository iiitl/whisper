// ============================================
// FILE: programs/whisper/src/lib.rs
// ============================================
use anchor_lang::prelude::*;

declare_id!("DHTV8Z1MNm7C5vNX5mUrR1QdNzipbytaHFimTZbycH9R");

#[program]
pub mod whisper {
    use super::*;

    pub fn create_confession(
        ctx: Context<CreateConfession>,
        content_uri: String,
    ) -> Result<()> {
        require!(
            content_uri.len() <= ConfessionAccount::MAX_URI_LENGTH,
            WhisperError::ContentUriTooLong
        );
        require!(!content_uri.is_empty(), WhisperError::EmptyContentUri);

        let confession = &mut ctx.accounts.confession;
        let clock = Clock::get()?;

        confession.author = ctx.accounts.author.key();
        confession.content_uri = content_uri;
        confession.like_count = 0;
        confession.comment_count = 0;
        confession.timestamp = clock.unix_timestamp;
        confession.bump = ctx.bumps.confession;

        msg!("Confession created: {}", confession.key());
        Ok(())
    }

    pub fn like_confession(ctx: Context<LikeConfession>) -> Result<()> {
        let confession = &mut ctx.accounts.confession;
        
        confession.like_count = confession
            .like_count
            .checked_add(1)
            .ok_or(WhisperError::LikeCountOverflow)?;

        msg!("Confession liked. Total likes: {}", confession.like_count);
        Ok(())
    }

    pub fn comment_confession(
        ctx: Context<CommentConfession>,
        content_uri: String,
    ) -> Result<()> {
        require!(
            content_uri.len() <= CommentAccount::MAX_URI_LENGTH,
            WhisperError::ContentUriTooLong
        );
        require!(!content_uri.is_empty(), WhisperError::EmptyContentUri);

        let confession = &mut ctx.accounts.confession;
        let comment = &mut ctx.accounts.comment;
        let clock = Clock::get()?;

        comment.confession = confession.key();
        comment.commenter = ctx.accounts.commenter.key();
        comment.content_uri = content_uri;
        comment.timestamp = clock.unix_timestamp;
        comment.bump = ctx.bumps.comment;

        confession.comment_count = confession
            .comment_count
            .checked_add(1)
            .ok_or(WhisperError::CommentCountOverflow)?;

        msg!("Comment added to confession: {}", confession.key());
        Ok(())
    }

    /// [FOSS ISSUE] Beginner: Add logic to close the confession account and reclaim rent
    pub fn delete_confession(_ctx: Context<DeleteConfession>) -> Result<()> {
        // TODO: Use Anchor's `close` constraint or manual account closing logic
        Ok(())
    }

    /// [FOSS ISSUE] Beginner: Add logic to decrement the like counter
    pub fn dislike_confession(_ctx: Context<DislikeConfession>) -> Result<()> {
        // TODO: Implement decrement logic with safety checks
        Ok(())
    }

    /// [FOSS ISSUE] Medium: Add logic to edit the confession content
    /// Restricted to a 10-minute window from creation time.
    pub fn edit_confession(
        _ctx: Context<EditConfession>,
        _new_content_uri: String,
    ) -> Result<()> {
        // TODO: Check clock.unix_timestamp against account creation timestamp
        Ok(())
    }

    /// [FOSS ISSUE] Medium: Add logic to transfer SOL to the author
    pub fn tip_author(_ctx: Context<TipAuthor>, _amount: u64) -> Result<()> {
        // TODO: Transfer SOL from tipper to author via system_program CPI
        Ok(())
    }

    /// [FOSS ISSUE] Medium: Initialize the user counter for multiple confessions
    pub fn initialize_user_counter(ctx: Context<InitializeUserCounter>) -> Result<()> {
        let user_counter = &mut ctx.accounts.user_counter;
        user_counter.count = 0;
        user_counter.bump = ctx.bumps.user_counter;
        Ok(())
    }
}

// ============================================
// ACCOUNT STRUCTURES
// ============================================

#[account]
pub struct ConfessionAccount {
    pub author: Pubkey,
    pub content_uri: String,
    pub like_count: u64,
    pub comment_count: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl ConfessionAccount {
    pub const MAX_URI_LENGTH: usize = 200;
    pub const SPACE: usize = 8 + 32 + 4 + Self::MAX_URI_LENGTH + 8 + 8 + 8 + 1;
}

#[account]
pub struct CommentAccount {
    pub confession: Pubkey,
    pub commenter: Pubkey,
    pub content_uri: String,
    pub timestamp: i64,
    pub bump: u8,
}

impl CommentAccount {
    pub const MAX_URI_LENGTH: usize = 200;
    pub const SPACE: usize = 8 + 32 + 32 + 4 + Self::MAX_URI_LENGTH + 8 + 1;
}

#[account]
pub struct UserCounter {
    pub count: u64,
    pub bump: u8,
}

impl UserCounter {
    pub const SPACE: usize = 8 + 8 + 1;
}

// ============================================
// CONTEXT STRUCTURES
// ============================================

#[derive(Accounts)]
#[instruction(content_uri: String)]
pub struct CreateConfession<'info> {
    #[account(
        init,
        payer = author,
        space = ConfessionAccount::SPACE,
        seeds = [
            b"confession",
            author.key().as_ref(),
        ],
        bump
    )]
    pub confession: Account<'info, ConfessionAccount>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikeConfession<'info> {
    #[account(mut)]
    pub confession: Account<'info, ConfessionAccount>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(content_uri: String)]
pub struct CommentConfession<'info> {
    #[account(mut)]
    pub confession: Account<'info, ConfessionAccount>,

    #[account(
        init,
        payer = commenter,
        space = CommentAccount::SPACE,
        seeds = [
            b"comment",
            confession.key().as_ref(),
            commenter.key().as_ref(),
        ],
        bump
    )]
    pub comment: Account<'info, CommentAccount>,

    #[account(mut)]
    pub commenter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteConfession {
    // TODO: Define keys needed for closing account
    // Hint: mutation access to confession, author as receiver
}

#[derive(Accounts)]
pub struct DislikeConfession {
    // TODO: Define keys needed for liking logic
}

#[derive(Accounts)]
pub struct EditConfession {
    // TODO: Define keys needed for editing logic
}

#[derive(Accounts)]
pub struct TipAuthor {
    // TODO: Define keys needed for tipping logic (tipper, author, etc)
}

#[derive(Accounts)]
pub struct InitializeUserCounter<'info> {
    #[account(
        init,
        payer = user,
        space = UserCounter::SPACE,
        seeds = [b"user_counter", user.key().as_ref()],
        bump
    )]
    pub user_counter: Account<'info, UserCounter>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ============================================
// ERROR DEFINITIONS
// ============================================

#[error_code]
pub enum WhisperError {
    #[msg("Content URI exceeds maximum allowed length")]
    ContentUriTooLong,
    
    #[msg("Content URI cannot be empty")]
    EmptyContentUri,
    
    #[msg("Like count overflow")]
    LikeCountOverflow,
    
    #[msg("Comment count overflow")]
    CommentCountOverflow,
}