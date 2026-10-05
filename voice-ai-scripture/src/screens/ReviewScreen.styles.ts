import { StyleSheet } from 'react-native';
import { touchTarget } from '../theme/tokens';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
  },
  modeTabContainer: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTab: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeModeTabText: {
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reference: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  translationBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  levelCard: {
    marginBottom: 16,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  assistedWarning: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 8,
  },
  clozeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  tokenTouchTarget: {
    minHeight: 36,
    justifyContent: 'center',
  },
  clozeToken: {
    fontSize: 18,
    lineHeight: 32,
  },
  clozeRevealed: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  peekToken: {
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  secondaryPillButton: {
    minHeight: touchTarget.min,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryPillButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
  },
  voiceHint: {
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 12,
    width: '100%',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreBadge: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  voiceActions: {
    width: '100%',
    marginTop: 8,
  },
  primaryHeroButton: {
    minHeight: touchTarget.min,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  doneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    minHeight: touchTarget.min,
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  practiceAgainButton: {
    borderWidth: 1,
  },
  nextLevelButton: {
    elevation: 2,
  },
  finishButton: {
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
