import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const securityUsers = await prisma.user.findMany({
      where: { role: 'security' },
      select: {
        id: true,
        name: true,
        employeeId: true,
        patrolSessions: {
          select: {
            id: true,
            status: true,
            patrolNumber: true,
            startedAt: true,
            completedAt: true,
            patrolDate: true
          }
        },
        findings: {
          select: {
            id: true
          }
        },
        achievements: {
          select: {
            badge: true,
            earnedAt: true
          }
        }
      }
    });

    const leaderboard = await Promise.all(securityUsers.map(async (user) => {
      const completedPatrols = user.patrolSessions.filter(s => s.status === 'completed').length;
      const totalSessions = user.patrolSessions.length;
      const findingsCount = user.findings.length;
      
      const onTimeRate = totalSessions > 0 
        ? Math.round((completedPatrols / totalSessions) * 100) 
        : 100;

      const missedPatrols = user.patrolSessions.filter(s => s.status === 'incomplete').length;

      // Score = (completedPatrols * 10) + (onTimeRate * 5) + (findingsCount * 15) - (missedPatrols * 20)
      const calculatedScore = (completedPatrols * 10) + Math.round(onTimeRate * 0.5) + (findingsCount * 15) - (missedPatrols * 20);
      const score = Math.max(0, calculatedScore);

      // Calculate streak (consecutive days with completed patrols)
      const dates = user.patrolSessions
        .filter(s => s.status === 'completed')
        .map(s => s.patrolDate.toISOString().split('T')[0]);
      
      const uniqueDates = Array.from(new Set(dates)).sort();
      let currentStreak = 0;
      if (uniqueDates.length > 0) {
        currentStreak = 1;
        for (let i = uniqueDates.length - 1; i > 0; i--) {
          const d1 = new Date(uniqueDates[i]);
          const d2 = new Date(uniqueDates[i - 1]);
          const diffTime = Math.abs(d1.getTime() - d2.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Check achievements dynamically and award badges
      const completedNightPatrols = user.patrolSessions.filter(s => s.status === 'completed' && s.patrolNumber >= 5).length;
      
      // Speed Runner check: completed a session in < 10 mins
      const hasFastSession = user.patrolSessions.some(s => {
        if (s.status === 'completed' && s.startedAt && s.completedAt) {
          const durationMins = (s.completedAt.getTime() - s.startedAt.getTime()) / (1000 * 60);
          return durationMins > 0 && durationMins < 10;
        }
        return false;
      });

      const eligibleBadges: string[] = [];
      if (findingsCount >= 1) eligibleBadges.push('first_blood');
      if (findingsCount >= 10) eligibleBadges.push('eagle_eye');
      if (completedNightPatrols >= 5) eligibleBadges.push('night_owl');
      if (currentStreak >= 3) eligibleBadges.push('streak_master');
      if (hasFastSession) eligibleBadges.push('speed_runner');
      if (onTimeRate === 100 && completedPatrols >= 10) eligibleBadges.push('perfect_score');

      // Sync achievements with DB
      const existingBadges = user.achievements.map(a => a.badge);
      const newBadges = eligibleBadges.filter(b => !existingBadges.includes(b));

      for (const badge of newBadges) {
        try {
          await prisma.userAchievement.create({
            data: {
              userId: user.id,
              badge
            }
          });
        } catch (e) {
          // Ignore unique constraints
        }
      }

      // Fetch updated achievements
      const allAchievements = [
        ...user.achievements,
        ...newBadges.map(b => ({ badge: b, earnedAt: new Date() }))
      ];

      return {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        score,
        streak: currentStreak,
        completedPatrols,
        findingsCount,
        onTimeRate,
        achievements: allAchievements.map(a => a.badge)
      };
    }));

    // Sort by score desc, then by completed patrols desc
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.completedPatrols - a.completedPatrols;
    });

    return NextResponse.json({
      leaderboard: sortedLeaderboard,
      myRank: sortedLeaderboard.findIndex(u => u.id === auth.id) + 1
    });
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
