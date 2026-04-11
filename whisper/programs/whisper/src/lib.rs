// ============================================
// FILE: programs/whisper/src/lib.rs
// ============================================
use anchor_lang::prelude::*;

declare_id!("FkHX79Aq5SjuKcXorsTQsweUSNoqUUR3Wyu7DS3ECzo4");

#[program]
pub mod whisper {
    use super::*;

    pub fn create_confession(
        ctx: Context<CreateConfession>,
        content_uri: String,
        index: u64,
    ) -> Result<()> {
        require!(
            content_uri.len() <= ConfessionAccount::MAX_URI_LENGTH,
            WhisperError::ContentUriTooLong
        );
        require!(!content_uri.is_empty(), WhisperError::EmptyContentUri);

        let confession = &mut ctx.accounts.confession;
        let user_counter = &mut ctx.accounts.user_counter;
        let clock = Clock::get()?;

        confession.author = ctx.accounts.author.key();
        confession.content_uri = content_uri;
        confession.like_count = 0;
        confession.comment_count = 0;
        confession.timestamp = clock.unix_timestamp;
        confession.index = user_counter.count; // Store current index
        confession.bump = ctx.bumps.confession;

        // Increment the user's total confession count
        user_counter.count = user_counter.count.checked_add(1).unwrap();

        msg!("Confession created at index: {}", confession.index);
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

    /// [FOSS ISSUE] Task 1: Account Lifecycle (Beginner)
    /// Implement the instruction to close a confession account and reclaim rent (SOL).
    /// Hint: Use Anchor's `close = author` constraint or manual account closing logic.
    pub fn delete_confession(_ctx: Context<DeleteConfession>) -> Result<()> {
        Ok(())
    }

    /// [FOSS ISSUE] Task 1: Account Lifecycle (Beginner)
    /// Implement logic to safely decrement the like counter.
    pub fn dislike_confession(ctx: Context<DislikeConfession>) -> Result<()> {
        let confession = &mut ctx.accounts.confession;
        confession.like_count = confession.like_count.checked_sub(1).unwrap_or(0);
        Ok(())
    }

    /// [FOSS ISSUE] Task 2: Edit Logic (Junior+)
    /// Implement the logic to update content_uri. 
    /// Advanced: Restrict edits to a 10-minute window from creation time.
    pub fn edit_confession(
        ctx: Context<EditConfession>,
        new_content_uri: String,
    ) -> Result<()> {
        require!(
            new_content_uri.len() <= ConfessionAccount::MAX_URI_LENGTH,
            WhisperError::ContentUriTooLong
        );
        let confession = &mut ctx.accounts.confession;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;

        require!(
            current_timestamp - confession.timestamp <= 600,
            WhisperError::EditWindowExpired
        );
        
        confession.content_uri = new_content_uri;
        msg!("Confession updated: {}", confession.key());
        Ok(())
    }

    /// [FOSS ISSUE] Task 3: Tipping System (Junior+)
    /// Transfer SOL from tipper to author via system_program CPI.
    pub fn tip_author(_ctx: Context<TipAuthor>, _amount: u64) -> Result<()> {
        // TODO: Transfer SOL from tipper to author
        Ok(())
    }

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
    pub index: u64, // The index of this confession for the user
    pub bump: u8,
}

impl ConfessionAccount {
    pub const MAX_URI_LENGTH: usize = 200;
    pub const SPACE: usize = 8 + 32 + 4 + Self::MAX_URI_LENGTH + 8 + 8 + 8 + 8 + 1;
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
#[instruction(content_uri: String, index: u64)]
pub struct CreateConfession<'info> {
    #[account(
        init,
        payer = author,
        space = ConfessionAccount::SPACE,
        seeds = [
            b"confession",
            author.key().as_ref(),
            index.to_le_bytes().as_ref(),
        ],
        bump
    )]
    pub confession: Box<Account<'info, ConfessionAccount>>,

    #[account(
        init_if_needed,
        payer = author,
        space = UserCounter::SPACE,
        seeds = [b"user_counter", author.key().as_ref()],
        bump
    )]
    pub user_counter: Box<Account<'info, UserCounter>>,

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
pub struct DeleteConfession<'info> {
    #[account(mut, has_one = author)]
    pub confession: Account<'info, ConfessionAccount>,
    #[account(mut)]
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct DislikeConfession<'info> {
    #[account(mut)]
    pub confession: Account<'info, ConfessionAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct EditConfession<'info> {
    #[account(mut, has_one = author)]
    pub confession: Account<'info, ConfessionAccount>,
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct TipAuthor<'info> {
    #[account(mut)]
    pub confession: Account<'info, ConfessionAccount>,
    #[account(mut)]
    pub tipper: Signer<'info>,
    /// CHECK: This is the recipient of the tip
    #[account(mut)]
    pub author: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
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

    #[msg("The 10-minute edit window has expired")]
    EditWindowExpired,
}