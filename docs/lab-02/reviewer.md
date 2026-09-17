# Lab 1 — Peer Review Record

**Author:** Chawin — 67070501012 — GitHub: [@Finyakginshabu](https://github.com/Finyakginshabu) \
**Peer reviewer:** Supichaya — 67070501087 — GitHub: [@PingSupichaya](https://github.com/PingSupichaya) \
**Review for:** Norawit — 67070501026 — GitHub: [@NxNxmm](https://github.com/NxNxmm)

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Finyakginshabu/toktickit/pull/17 | feature/lab2-database-and-seeds | Approved |
| https://github.com/Finyakginshabu/toktickit/pull/18 | feature/lab2-dev-requester-context | Approved |
| https://github.com/Finyakginshabu/toktickit/pull/19 | feature/lab2-create-ticket-flow | Approved |
| https://github.com/Finyakginshabu/toktickit/pull/20 | feature/lab2-my-tickets-flow | Approved |
| https://github.com/Finyakginshabu/toktickit/pull/21 | feature/lab2-ticket-detail-attachments | Approved |
| https://github.com/Finyakginshabu/toktickit/pull/22 | feature/lab2-e2e-and-visual-checklist | Approved |

| PR | Reviewer Feedback | Author Response |
| --- | --- | --- |
| [#17](https://github.com/Finyakginshabu/toktickit/pull/17) | The added database tables are well designed and usable. The migration runs smoothly as well. Nice! | Thanks for the review :P <3 |
| [#18](https://github.com/Finyakginshabu/toktickit/pull/18) | The selector modal and requester information work smoothly. All tests passed. Such a good Zen Green 🤧 | Thanks for the review :P <3, Zen Green is such a good color that cannot be found anywhere else right? :D |
| [#19](https://github.com/Finyakginshabu/toktickit/pull/19) | Ticket can be created and attachment can be uploaded max 5 files. All tests passed, drop down of category and system are corrected. Great job! | Thanks for the review :P <3 |
| [#20](https://github.com/Finyakginshabu/toktickit/pull/20) | Now I can see my tickets, every details are covered, UI can work in both desktop view and mobile view, and every tests passed then this feature can work successfully. Nice job kub! | Thanks for the review :P <3 |
| [#21](https://github.com/Finyakginshabu/toktickit/pull/21) | In each ticket can show every details, for soft removes can be used in every account of requester. Your web page is easy to read and this feature can work without any bug. Great job! | Thanks for the review :P <3 |
| [#22](https://github.com/Finyakginshabu/toktickit/pull/22) | This feature is really work! everything test passed and runs smoothly. The e2e screenshots can use to keep screenshots in project. Good job! | Thanks so much for reviewing all my issues and PRs throughout this lab! :P <3 |

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/NxNxmm/toktickit/pull/22 | feature/lab2-spec | Approved |
| https://github.com/NxNxmm/toktickit/pull/23 | feature/lab2-db-seed | Approved |
| https://github.com/NxNxmm/toktickit/pull/24 | feature/requester-context | Approved |
| https://github.com/NxNxmm/toktickit/pull/25 | feature/create-ticket | Approved |
| https://github.com/NxNxmm/toktickit/pull/26 | feature/my-tickets | Request Changes |
| https://github.com/NxNxmm/toktickit/pull/27 | feature/ticket-detail-attachments | Approved |
| https://github.com/NxNxmm/toktickit/pull/28 |  | Approved |

| PR | My Review Comment | Partner Response |
| :--- | :--- | :--- |
| [#22](https://github.com/NxNxmm/toktickit/pull/22) | **LGTM**<br>Engineering contract in `docs/lab-02/` is solid and well-structured. FRs, BRs, ACs, API contracts, and Zen Green UI tokens are clearly defined. The test plan in `tests.md` provides good coverage for all required acceptance criteria. | - |
| [#23](https://github.com/NxNxmm/toktickit/pull/23) | **LGTM**<br>All acceptance criteria met. `schema.prisma` contains `RequesterUser`, `Category`, `RelatedSystem`, `Ticket`, and `Attachment`, compound indexes, and database migration executes successfully. No duplicate seed when run multiple times. Good Job! | Tq kubbb. |
| [#24](https://github.com/NxNxmm/toktickit/pull/24) | Tested requesters with selection UI. Correctly handles changing requesters and displays error when no API is connected. Shell screens ready.<br><br>_*Note:* Consider responsive design for different screen sizes in upcoming tasks. :D_ | I'll keep that in mind kub. Tysm! |
| [#25](https://github.com/NxNxmm/toktickit/pull/25) | **LGTM**<br>Tested according to acceptance criteria. 'My Ticket' view isn't implemented yet, so unique ticket no. can't be viewed client-side, but verified generation in API. Text limits and file restrictions handled well. | Glad I've passed everything kub! We'll see other components in next issue! |
| [#26](https://github.com/NxNxmm/toktickit/pull/26) | **Request Changes**<br>Tested acceptance criteria (searching, filtering, sorting work well). Requesting changes for:<br>- **Ticket Number Generation:** Issue with ticket number generation logic.<br>- **Mobile Navigation:** Navbar overflows on smaller screens. Recommend hamburger menu. | Thanks for the detailed review! I have no idea why it worked before I pushed but I've fixed it anyway. Also, I've adjust a Hamburger Menu for mobile responsive as suggested kub. Please check them again and let me hear what you think! |
| [#26](https://github.com/NxNxmm/toktickit/pull/26) | Thanks for addressing the feedback! Verified the fixes for ticket number generation and the mobile navbar, everything looks clean and works as expected. Search, filtering, and API ticket scoping all look good. :D 👍 | - |
| [#27](https://github.com/NxNxmm/toktickit/pull/27) | lgtm, everything meets the acceptance criteria and works smoothly. <br><br> Minor UX Suggestion (Optional): Currently in 'My Tickets', users have to click on the green ticket number link to view details. My suggestion is making the entire row clickable would make navigation much smoother. Good job! :D | Tysm! I'd love to make that change in next issue kub <3 |
| [#28](https://github.com/NxNxmm/toktickit/pull/28) | Well done! Your E2E tests are thorough and demonstrated well. The responsiveness across desktop, mobile, and tablet looks great, and the artifact screenshots are super clear. It was a pleasure reviewing your code for Lab 02 <3 | Yayyyy thanks for all your lovely reviews kubbb <3 |