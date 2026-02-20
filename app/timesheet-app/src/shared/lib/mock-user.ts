// Mock user impersonation support
let _mockUserId: string | null = null

export function setMockUserId(userId: string | null) {
    _mockUserId = userId
}

export function getMockUserId(): string | null {
    return _mockUserId
}
