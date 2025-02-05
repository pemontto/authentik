package ldap

import (
	"context"
	"errors"
	"strings"

	"github.com/getsentry/sentry-go"
	goldap "github.com/go-ldap/ldap/v3"
	"github.com/nmcclain/ldap"
	"github.com/prometheus/client_golang/prometheus"
	log "github.com/sirupsen/logrus"
	"goauthentik.io/api"
	"goauthentik.io/internal/outpost"
	"goauthentik.io/internal/outpost/ldap/metrics"
	"goauthentik.io/internal/utils"
)

const ContextUserKey = "ak_user"

func (pi *ProviderInstance) getUsername(dn string) (string, error) {
	if !strings.HasSuffix(strings.ToLower(dn), strings.ToLower(pi.BaseDN)) {
		return "", errors.New("invalid base DN")
	}
	dns, err := goldap.ParseDN(dn)
	if err != nil {
		return "", err
	}
	for _, part := range dns.RDNs {
		for _, attribute := range part.Attributes {
			if strings.ToLower(attribute.Type) == "cn" {
				return attribute.Value, nil
			}
		}
	}
	return "", errors.New("failed to find cn")
}

func (pi *ProviderInstance) Bind(username string, req BindRequest) (ldap.LDAPResultCode, error) {
	fe := outpost.NewFlowExecutor(req.ctx, pi.flowSlug, pi.s.ac.Client.GetConfig(), log.Fields{
		"bindDN":    req.BindDN,
		"client":    utils.GetIP(req.conn.RemoteAddr()),
		"requestId": req.id,
	})
	fe.DelegateClientIP(req.conn.RemoteAddr())
	fe.Params.Add("goauthentik.io/outpost/ldap", "true")

	fe.Answers[outpost.StageIdentification] = username
	fe.Answers[outpost.StagePassword] = req.BindPW

	passed, err := fe.Execute()
	if !passed {
		metrics.RequestsRejected.With(prometheus.Labels{
			"outpost_name": pi.outpostName,
			"type":         "bind",
			"reason":       "invalid_credentials",
			"dn":           req.BindDN,
			"client":       utils.GetIP(req.conn.RemoteAddr()),
		}).Inc()
		return ldap.LDAPResultInvalidCredentials, nil
	}
	if err != nil {
		metrics.RequestsRejected.With(prometheus.Labels{
			"outpost_name": pi.outpostName,
			"type":         "bind",
			"reason":       "flow_error",
			"dn":           req.BindDN,
			"client":       utils.GetIP(req.conn.RemoteAddr()),
		}).Inc()
		req.log.WithError(err).Warning("failed to execute flow")
		return ldap.LDAPResultOperationsError, nil
	}

	access, err := fe.CheckApplicationAccess(pi.appSlug)
	if !access {
		req.log.Info("Access denied for user")
		metrics.RequestsRejected.With(prometheus.Labels{
			"outpost_name": pi.outpostName,
			"type":         "bind",
			"reason":       "access_denied",
			"dn":           req.BindDN,
			"client":       utils.GetIP(req.conn.RemoteAddr()),
		}).Inc()
		return ldap.LDAPResultInsufficientAccessRights, nil
	}
	if err != nil {
		metrics.RequestsRejected.With(prometheus.Labels{
			"outpost_name": pi.outpostName,
			"type":         "bind",
			"reason":       "access_check_fail",
			"dn":           req.BindDN,
			"client":       utils.GetIP(req.conn.RemoteAddr()),
		}).Inc()
		req.log.WithError(err).Warning("failed to check access")
		return ldap.LDAPResultOperationsError, nil
	}
	req.log.Info("User has access")
	uisp := sentry.StartSpan(req.ctx, "authentik.providers.ldap.bind.user_info")
	// Get user info to store in context
	userInfo, _, err := fe.ApiClient().CoreApi.CoreUsersMeRetrieve(context.Background()).Execute()
	if err != nil {
		metrics.RequestsRejected.With(prometheus.Labels{
			"outpost_name": pi.outpostName,
			"type":         "bind",
			"reason":       "user_info_fail",
			"dn":           req.BindDN,
			"client":       utils.GetIP(req.conn.RemoteAddr()),
		}).Inc()
		req.log.WithError(err).Warning("failed to get user info")
		return ldap.LDAPResultOperationsError, nil
	}
	pi.boundUsersMutex.Lock()
	cs := pi.SearchAccessCheck(userInfo.User)
	pi.boundUsers[req.BindDN] = UserFlags{
		UserPk:    userInfo.User.Pk,
		CanSearch: cs != nil,
	}
	if pi.boundUsers[req.BindDN].CanSearch {
		req.log.WithField("group", cs).Info("Allowed access to search")
	}
	uisp.Finish()
	defer pi.boundUsersMutex.Unlock()
	return ldap.LDAPResultSuccess, nil
}

// SearchAccessCheck Check if the current user is allowed to search
func (pi *ProviderInstance) SearchAccessCheck(user api.UserSelf) *string {
	for _, group := range user.Groups {
		for _, allowedGroup := range pi.searchAllowedGroups {
			pi.log.WithField("userGroup", group.Pk).WithField("allowedGroup", allowedGroup).Trace("Checking search access")
			if group.Pk == allowedGroup.String() {
				return &group.Name
			}
		}
	}
	return nil
}

func (pi *ProviderInstance) TimerFlowCacheExpiry() {
	fe := outpost.NewFlowExecutor(context.Background(), pi.flowSlug, pi.s.ac.Client.GetConfig(), log.Fields{})
	fe.Params.Add("goauthentik.io/outpost/ldap", "true")
	fe.Params.Add("goauthentik.io/outpost/ldap-warmup", "true")

	err := fe.WarmUp()
	if err != nil {
		pi.log.WithError(err).Warning("failed to warm up flow cache")
	}
}
